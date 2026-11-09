import { serve } from "bun";
import index from "./index.html";
import { CONFIG, MAP_CONFIG } from "./config";
import { rosBridge } from "./services/rosBridge";
import { studioProcess } from "./services/studioProcess";
import { mapManager } from "./services/mapManager";

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

    // 3. Map & Route Manager API (Native Bun File Handler + ROS Sync)
    "/api/map-layout": async () => {
      try {
        const layout = await mapManager.getMapLayout();
        return Response.json(layout);
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    },

    // 3.1 Station Services: อ่าน/บันทึกสถานี
    "/api/stations": async (req) => {
      if (req.method === "POST") {
        if (rosBridge.telemetry.navigation?.navigation_status === "Got path planning") {
          return Response.json(
            { error: "ห้ามแก้ไขผัง: หุ่นยนต์กำลังวิ่งนำทางอยู่ (Hardware-Interlock)" },
            { status: 423 },
          );
        }
        try {
          const body = await req.json();
          const result = await mapManager.saveStations(body);
          return Response.json(result);
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 400 });
        }
      }

      // GET: อ่านจาก ROS Service /read_station หรือ Fallback จาก CSV
      try {
        const res = await rosBridge.callService("/read_station", {
          read_action: true,
        });
        return Response.json(res);
      } catch (err: any) {
        const layout = await mapManager.getMapLayout();
        return Response.json({
          station_total: layout.stations.length,
          station_data: layout.stations,
          status: "Read from CSV (ROS Offline)",
        });
      }
    },

    // 3.2 Waypoint Services: อ่าน/บันทึก Waypoints
    "/api/waypoints": async (req) => {
      if (req.method === "POST") {
        if (rosBridge.telemetry.navigation?.navigation_status === "Got path planning") {
          return Response.json(
            { error: "ห้ามแก้ไขผัง: หุ่นยนต์กำลังวิ่งนำทางอยู่ (Hardware-Interlock)" },
            { status: 423 },
          );
        }
        try {
          const body = await req.json();
          const result = await mapManager.saveWaypoints(body);
          return Response.json(result);
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 400 });
        }
      }

      const layout = await mapManager.getMapLayout();
      return Response.json({ waypoints: layout.waypoints });
    },

    // 3.3 Track Services: อ่าน/บันทึก รางเดินรถ
    "/api/tracks": async (req) => {
      if (req.method === "POST") {
        if (rosBridge.telemetry.navigation?.navigation_status === "Got path planning") {
          return Response.json(
            { error: "ห้ามแก้ไขผัง: หุ่นยนต์กำลังวิ่งนำทางอยู่ (Hardware-Interlock)" },
            { status: 423 },
          );
        }
        try {
          const body = await req.json();
          const result = await mapManager.saveTracks(body);
          return Response.json(result);
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 400 });
        }
      }

      const layout = await mapManager.getMapLayout();
      return Response.json({ tracks: layout.tracks });
    },

    // 3.4 ลบโหนดพร้อม Dangling Edge Protection (HTTP 409 Conflict)
    "/api/node/:name": async (req: any) => {
      if (req.method === "DELETE") {
        if (rosBridge.telemetry.navigation?.navigation_status === "Got path planning") {
          return Response.json(
            { error: "ห้ามแก้ไขผัง: หุ่นยนต์กำลังวิ่งนำทางอยู่ (Hardware-Interlock)" },
            { status: 423 },
          );
        }
        try {
          const url = new URL(req.url);
          const name = req.params?.name || url.pathname.replace("/api/node/", "");
          const force = url.searchParams.get("force") === "true";
          const result = await mapManager.deleteNode(decodeURIComponent(name), force);
          if (!result.success && result.warning === "DanglingEdgeDetected") {
            return Response.json(result, { status: 409 });
          }
          return Response.json(result);
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 400 });
        }
      }
      return new Response("Method Not Allowed", { status: 405 });
    },

    "/api/robot/go-station": async (req) => {
      try {
        const body = (await req.json()) as { target_station?: string; station_name?: string };
        const targetName = (body.target_station || body.station_name || "").trim();
        if (!targetName) return Response.json({ error: "Missing target station name" }, { status: 400 });

        // 1. ลองเรียก /go_station ของ ROS ดูก่อน
        let rosResult: any = null;
        try {
          const res = await rosBridge.callService("/go_station", {
            target_station: targetName,
          });
          rosResult = res;
          // ถ้า ROS ยอมรับและมีเป้าหมายใน station_list.csv
          if (res && res.status && !res.status.startsWith("Error no target station")) {
            return Response.json(res);
          }
        } catch (rosErr) {
          // ROS service offline หรือ error
        }

        // 2. ถ้า ROS ไม่พบโหนด (เช่น เป็น Waypoint หรือโหนดที่เพิ่งเพิ่มใหม่)
        // ให้ค้นหาพิกัดจาก mapLayout (ทั้ง stations และ waypoints) แล้วส่งตรงเข้า move_base
        const layout = await mapManager.getMapLayout();
        const allNodes = [...layout.stations, ...layout.waypoints];
        const targetNode = allNodes.find((n) => n.name.toLowerCase() === targetName.toLowerCase());

        if (targetNode) {
          const goalMsg = {
            header: {
              frame_id: "map",
              stamp: { secs: 0, nsecs: 0 },
            },
            pose: {
              position: { x: targetNode.x, y: targetNode.y, z: targetNode.z || 0.0 },
              orientation: {
                x: targetNode.qx || 0.0,
                y: targetNode.qy || 0.0,
                z: targetNode.qz || 0.0,
                w: targetNode.qw ?? 1.0,
              },
            },
          };
          rosBridge.publish("/move_base_simple/goal", "geometry_msgs/PoseStamped", goalMsg);
          rosBridge.publish("/amv/command/goto_station", "std_msgs/String", { data: targetNode.name });
          return Response.json({
            status: `Going to node --> ${targetNode.name} (${targetNode.x.toFixed(2)}, ${targetNode.y.toFixed(2)})`,
            node: targetNode.name,
            direct_nav: true,
          });
        }

        return Response.json(
          rosResult || { error: `ไม่พบโหนด [${targetName}] ในระบบผังสถานีและ Waypoints` },
          { status: 404 },
        );
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    },

    // 3.5 Queue Navigation Service: ส่งคำสั่งคิวสถานี 1-5 (amv_service/GoStationQueue.srv)
    "/api/robot/go-station-queue": async (req) => {
      try {
        const body = (await req.json()) as {
          queue?: string[];
          target_station_q1?: string;
          target_station_q2?: string;
          target_station_q3?: string;
          target_station_q4?: string;
          target_station_q5?: string;
        };
        const q = body.queue || [];
        const payload = {
          target_station_q1: body.target_station_q1 || q[0] || "None",
          target_station_q2: body.target_station_q2 || q[1] || "None",
          target_station_q3: body.target_station_q3 || q[2] || "None",
          target_station_q4: body.target_station_q4 || q[3] || "None",
          target_station_q5: body.target_station_q5 || q[4] || "None",
        };
        console.log("[INFO] [API] Calling /go_station_queue with:", payload);
        const res = await rosBridge.callService("/go_station_queue", payload);
        return Response.json(res);
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    },

    // 3.6 Pick & Place Station List Service: รับ-ส่งของ (amv_service/GoStationList.srv)
    "/api/robot/go-station-list": async (req) => {
      try {
        const body = (await req.json()) as {
          send_station?: string;
          receive_station?: string;
        };
        const payload = {
          send_station: body.send_station || "None",
          receive_station: body.receive_station || "None",
        };
        console.log("[INFO] [API] Calling /go_station_list with:", payload);
        const res = await rosBridge.callService("/go_station_list", payload);
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

    // 3.7 Queue Stepper / Cancel Service: ควบคุมคิวสถานี (amv_service/CommandNextStation.srv)
    "/api/robot/cmd-req": async (req) => {
      try {
        const body = (await req.json().catch(() => ({}))) as { command?: string };
        const cmd = body.command || "Next";
        console.log("[INFO] [API] Calling /cmd_req with command:", cmd);
        const res = await rosBridge.callService("/cmd_req", {
          command: cmd,
        });
        return Response.json(res);
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    },

    // 3.8 Cancel Navigation Action: ยกเลิก Goal นำทางใน move_base ทันที (หยุดค้าง / Reset Interlock)
    "/api/robot/cancel-navigation": async () => {
      try {
        console.log("[INFO] [API] Cancelling active navigation...");
        const res = await rosBridge.cancelNavigation();
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

    // 6. เสิร์ฟโมเดล 3D AGV สำหรับ Three.js (Digital Twin)
    "/module/agv.glb": async () => {
      const file = Bun.file("./public/module/agv.glb");
      if (await file.exists()) {
        return new Response(file, {
          headers: {
            "Content-Type": "model/gltf-binary",
            "Cache-Control": "public, max-age=86400",
          },
        });
      }
      return new Response("3D model not found", { status: 404 });
    },

    // 7. เสิร์ฟหน้าเว็บ React (index.html + bundle TSX/CSS บนแรมอัตโนมัติ)
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    // เปิด Hot Module Replacement (HMR) แก้โค้ดแล้วจออัปเดตทันที
    hmr: true,
  },
});

console.log(`[INFO] [Server] AGV Fullstack running at ${server.url}`);
