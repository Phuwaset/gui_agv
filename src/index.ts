import { serve } from "bun";
import index from "./index.html";
import { CONFIG, MAP_CONFIG } from "./config";
import { rosBridge } from "./services/rosBridge";
import { studioProcess } from "./services/studioProcess";

const server = serve({
  port: CONFIG.PORT, // พอร์ต 3000

  routes: {
    // 1. เส้นทาง API สำหรับส่งสถานะหุ่นยนต์สดให้หน้าเว็บ
    "/api/robot/telemetry": () => {
      return Response.json(rosBridge.telemetry);
    },

    // 2. Process Controller: ควบคุม Launch File Offline Recording
    "/api/studio/status": () => {
      return Response.json(studioProcess.status());
    },
    "/api/studio/start": async () => {
      return Response.json(studioProcess.start());
    },
    "/api/studio/stop": async () => {
      return Response.json(studioProcess.stop());
    },

    // 3. Station Services: อ่าน/สั่งการสถานีผ่าน ROS Service
    "/api/stations": async () => {
      try {
        const res = await rosBridge.callService("/read_station", {
          read_action: true,
        });
        return Response.json(res);
      } catch (err: any) {
        return Response.json(
          { error: err.message, status: "Offline / Service Unavailable" },
          { status: 503 },
        );
      }
    },

    "/api/robot/go-station": async (req) => {
      try {
        const body = (await req.json()) as { target_station: string };
        const res = await rosBridge.callService("/go_station", {
          target_station: body.target_station,
        });
        return Response.json(res);
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    },

    "/api/robot/reset-position": async (req) => {
      try {
        const body = (await req.json()) as { target_station: string };
        const res = await rosBridge.callService("/reset_position", {
          target_station: body.target_station,
        });
        return Response.json(res);
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    },

    // 4. Dynamic Map Service: ดึงผังโรงงาน Base64 จาก ROS Service /get_map_image
    "/api/map/dynamic": async () => {
      try {
        console.log("[INFO] [API] Requesting factory map from ROS /get_map_image...");
        const res = await rosBridge.callService("/get_map_image", {});
        const rawMessage = res?.message || (typeof res === "string" ? res : "");

        if (!rawMessage) {
          throw new Error("Empty response from /get_map_image");
        }

        let mapPayload: any;
        try {
          mapPayload = JSON.parse(rawMessage);
        } catch (jsonErr) {
          console.error("[ERROR] [API] Failed to parse /get_map_image JSON payload:", jsonErr);
          throw new Error("Invalid JSON format from /get_map_image");
        }

        // แคชไฟล์ PNG ลง disk เผื่อใช้สำหรับ Static File
        if (mapPayload.image_base64 && typeof mapPayload.image_base64 === "string") {
          try {
            const base64Data = mapPayload.image_base64.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, "base64");
            await Bun.write("./public/mektec_20260917_remap.png", buffer);
            console.log(`[INFO] [API] Cached map to ./public/mektec_20260917_remap.png (${buffer.length} bytes)`);
          } catch (cacheErr) {
            console.warn("[WARN] [API] Could not cache map to disk:", cacheErr);
          }
        }

        return Response.json({
          success: true,
          image_base64: mapPayload.image_base64,
          resolution: mapPayload.resolution ?? MAP_CONFIG.RESOLUTION,
          origin: mapPayload.origin ?? [MAP_CONFIG.ORIGIN_X, MAP_CONFIG.ORIGIN_Y, 0.0],
          width: mapPayload.width ?? MAP_CONFIG.IMAGE_WIDTH,
          height: mapPayload.height ?? MAP_CONFIG.IMAGE_HEIGHT,
        });
      } catch (err: any) {
        console.warn(`[WARN] [API] /get_map_image unavailable (${err.message}). Checking local cache...`);
        // Fallback: หาก ROS ยังไม่ต่อ หรือออฟไลน์ ให้ตอบกลับข้อมูล Metadata มาตรฐาน
        return Response.json({
          success: false,
          fallback: true,
          image_url: "/api/map/mektec_20260917_remap.png",
          resolution: MAP_CONFIG.RESOLUTION,
          origin: [MAP_CONFIG.ORIGIN_X, MAP_CONFIG.ORIGIN_Y, 0.0],
          width: MAP_CONFIG.IMAGE_WIDTH,
          height: MAP_CONFIG.IMAGE_HEIGHT,
          error: err.message,
        });
      }
    },

    // 5. เสิร์ฟภาพแผนที่โรงงาน Mektec (Static Map Asset)
    "/api/map/mektec_20260917_remap.png": async () => {
      // ตรวจสอบไฟล์บน Ubuntu ของหุ่นยนต์จริง
      const linuxFile = Bun.file(MAP_CONFIG.LINUX_PATH);
      if (await linuxFile.exists()) {
        return new Response(linuxFile, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=86400",
          },
        });
      }

      // ตรวจสอบไฟล์ในเครื่องโฟลเดอร์ public หรือ root
      const localFile = Bun.file("./public/mektec_20260917_remap.png");
      if (await localFile.exists()) {
        return new Response(localFile, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=86400",
          },
        });
      }

      return new Response("Map image not found", { status: 404 });
    },

    // 5. เสิร์ฟหน้าเว็บ React (index.html + bundle TSX/CSS บนแรมอัตโนมัติ)
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    // เปิด Hot Module Replacement (HMR) แก้โค้ดแล้วจออัปเดตทันที
    hmr: true,
  },
});

console.log(`[INFO] [Server] AGV Fullstack running at ${server.url}`);
