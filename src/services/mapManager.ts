import { join } from "path";
import { STATION_CONFIG } from "../config";
import { rosBridge } from "./rosBridge";
import type { StationData, TrackEdge, MapLayoutData } from "../types/telemetry";

// 1. ระบุ Directory พิกัดไฟล์ (รองรับทั้ง Linux On-Robot และ Windows Local Development)
async function getStationDir(): Promise<string> {
  const linuxDir = Bun.file(join(STATION_CONFIG.LINUX_DIR, "station_list.csv"));
  if (await linuxDir.exists()) {
    return STATION_CONFIG.LINUX_DIR;
  }
  return STATION_CONFIG.LOCAL_DIR;
}

// 2. Helper: บันทึกไฟล์พร้อมสร้างสำเนา .bak อัตโนมัติ (Atomic & Safe)
async function safeWriteWithBackup(filePath: string, content: string): Promise<void> {
  const file = Bun.file(filePath);
  if (await file.exists()) {
    try {
      const existingText = await file.text();
      await Bun.write(`${filePath}.bak`, existingText);
      console.log(`[INFO] [MapManager] Backup created: ${filePath}.bak`);
    } catch (bakErr) {
      console.warn(`[WARN] [MapManager] Failed to create backup for ${filePath}:`, bakErr);
    }
  }
  await Bun.write(filePath, content);
  console.log(`[INFO] [MapManager] Successfully written: ${filePath} (${content.length} chars)`);
}

// 3. Helper: สะกิดบอกพี่ ROS ให้รีโหลด Markers ทันทีผ่าน rosBridge Service
async function triggerRosReload(): Promise<void> {
  try {
    console.log("[INFO] [MapManager] Triggering ROS reload service /amv/reload_markers...");
    await rosBridge.callService("/amv/reload_markers", {});
    console.log("[INFO] [MapManager] ROS /amv/reload_markers acknowledged successfully");
  } catch (err: any) {
    console.warn(`[WARN] [MapManager] Cannot notify ROS reload (${err.message}) - ROS may be offline`);
  }
}

// 4. Parser: สำหรับอ่าน CSV ทั่วไป และข้าม Comment ภาษาไทย (# ...)
function parseCsv(text: string): StationData[] {
  const lines = text.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));
  if (lines.length <= 1) return [];
  const headers = lines[0].split(",").map((h) => h.trim());

  return lines.slice(1).map((l) => {
    const vals = l.split(",");
    const obj: any = {};
    headers.forEach((h, i) => {
      const val = vals[i] ? vals[i].trim() : "";
      if (["x", "y", "z", "qx", "qy", "qz", "qw", "theta"].includes(h)) {
        obj[h] = parseFloat(val) || 0;
      } else if (h === "timer") {
        obj[h] = parseInt(val, 10) || 0;
      } else {
        obj[h] = val;
      }
    });
    return obj as StationData;
  });
}

// 5. Parser: สำหรับอ่าน manual_track.csv โดยเฉพาะ (กรอง Comment ภาษาไทย "# ช่วง ..." และโหนดไม่สมบูรณ์)
function parseTrackCsv(text: string): TrackEdge[] {
  const lines = text.split("\n");
  const result: TrackEdge[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("from_node")) continue;
    const parts = trimmed.split(",");
    if (parts.length >= 2) {
      const from = parts[0].trim();
      const to = parts[1].trim();
      if (!from || !to || from === "__DELETED__" || to === "__DELETED__") continue;
      result.push({
        from_node: from,
        to_node: to,
        mode: (parts[2] || "bidirectional").trim(),
      });
    }
  }
  return result;
}

// 6. แปลง Array of StationData กลับเป็น CSV String
function serializeStationCsv(items: StationData[]): string {
  const header = "name,mode,timer,pin,x,y,z,qx,qy,qz,qw,theta\n";
  const rows = items
    .map(
      (s) =>
        `${s.name},${s.mode || "Auto"},${s.timer ?? 1},${s.pin || "Up"},` +
        `${s.x},${s.y},${s.z ?? 0.0},${s.qx ?? 0.0},${s.qy ?? 0.0},${s.qz ?? 0.0},${s.qw ?? 1.0},${s.theta ?? 0.0}`,
    )
    .join("\n");
  return header + rows + "\n";
}

// 7. แปลง Array of TrackEdge กลับเป็น CSV String (กรองโหนดที่ถูกลบหรือว่างทิ้ง)
function serializeTrackCsv(tracks: TrackEdge[]): string {
  const header = "from_node,to_node,mode\n";
  const validTracks = tracks.filter(
    (t) => t.from_node && t.to_node && t.from_node !== "__DELETED__" && t.to_node !== "__DELETED__",
  );
  const rows = validTracks.map((t) => `${t.from_node},${t.to_node},${t.mode || "bidirectional"}`).join("\n");
  return header + rows + "\n";
}

export class MapManagerService {
  // ดึงข้อมูลผังโรงงานทั้งหมด (สถานี, Waypoints, รางเดินรถ)
  public async getMapLayout(): Promise<MapLayoutData> {
    const dir = await getStationDir();
    const stFile = Bun.file(join(dir, "station_list.csv"));
    const wpFile = Bun.file(join(dir, "waypoint_follower_list.csv"));
    const trFile = Bun.file(join(dir, "manual_track.csv"));

    const [stText, wpText, trText] = await Promise.all([
      stFile.exists().then((e) => (e ? stFile.text() : "")),
      wpFile.exists().then((e) => (e ? wpFile.text() : "")),
      trFile.exists().then((e) => (e ? trFile.text() : "")),
    ]);

    return {
      stations: parseCsv(stText),
      waypoints: parseCsv(wpText),
      tracks: parseTrackCsv(trText),
    };
  }

  // อัปเดตรายการสถานีทั้งหมด
  public async saveStations(stations: StationData[]): Promise<{ success: boolean; count: number }> {
    if (!Array.isArray(stations)) throw new Error("Invalid schema: stations must be an array");
    const dir = await getStationDir();
    const csvContent = serializeStationCsv(stations);
    await safeWriteWithBackup(join(dir, "station_list.csv"), csvContent);
    await triggerRosReload();
    return { success: true, count: stations.length };
  }

  // อัปเดตรายการ Waypoints ทั้งหมด
  public async saveWaypoints(waypoints: StationData[]): Promise<{ success: boolean; count: number }> {
    if (!Array.isArray(waypoints)) throw new Error("Invalid schema: waypoints must be an array");
    const dir = await getStationDir();
    const csvContent = serializeStationCsv(waypoints);
    await safeWriteWithBackup(join(dir, "waypoint_follower_list.csv"), csvContent);
    await triggerRosReload();
    return { success: true, count: waypoints.length };
  }

  // อัปเดตรายการรางเดินรถ (Manual Tracks) ทั้งหมด
  public async saveTracks(tracks: TrackEdge[]): Promise<{ success: boolean; count: number }> {
    if (!Array.isArray(tracks)) throw new Error("Invalid schema: tracks must be an array");
    const dir = await getStationDir();
    const csvContent = serializeTrackCsv(tracks);
    await safeWriteWithBackup(join(dir, "manual_track.csv"), csvContent);
    await triggerRosReload();
    return { success: true, count: tracks.length };
  }

  // ลบโหนด (สถานี หรือ Waypoint) พร้อมระบบ Dangling Edge Protection (HTTP 409 Conflict)
  public async deleteNode(
    nodeName: string,
    force: boolean = false,
  ): Promise<{
    success: boolean;
    warning?: string;
    message?: string;
    connectedEdges?: TrackEdge[];
    deletedNode?: string;
    removedEdges?: number;
  }> {
    const cleanName = nodeName.trim();
    if (!cleanName) throw new Error("Node name is required");

    const dir = await getStationDir();
    const trFile = Bun.file(join(dir, "manual_track.csv"));
    const trText = (await trFile.exists()) ? await trFile.text() : "";
    const tracks = parseTrackCsv(trText);

    // ตรวจสอบว่าโหนดนี้มีเส้นทางเชื่อมโยงอยู่ใน manual_track.csv หรือไม่
    const connectedEdges = tracks.filter(
      (t) =>
        t.from_node.toLowerCase() === cleanName.toLowerCase() ||
        t.to_node.toLowerCase() === cleanName.toLowerCase(),
    );

    // หากพบว่ามีรางเชื่อมต่ออยู่ และผู้ใช้ยังไม่ได้กดยืนยันตัดราง (force != true)
    if (connectedEdges.length > 0 && !force) {
      return {
        success: false,
        warning: "DanglingEdgeDetected",
        message: `โหนด [${cleanName}] มีเส้นทางเชื่อมต่ออยู่ ${connectedEdges.length} เส้น!`,
        connectedEdges,
      };
    }

    // กรณี force === true หรือไม่มีรางเชื่อมโยง:
    // 1. กรองโหนดออกจาก station_list.csv
    const stFile = Bun.file(join(dir, "station_list.csv"));
    if (await stFile.exists()) {
      const stList = parseCsv(await stFile.text());
      const filteredSt = stList.filter((s) => s.name.toLowerCase() !== cleanName.toLowerCase());
      if (filteredSt.length !== stList.length) {
        await safeWriteWithBackup(join(dir, "station_list.csv"), serializeStationCsv(filteredSt));
      }
    }

    // 2. กรองโหนดออกจาก waypoint_follower_list.csv
    const wpFile = Bun.file(join(dir, "waypoint_follower_list.csv"));
    if (await wpFile.exists()) {
      const wpList = parseCsv(await wpFile.text());
      const filteredWp = wpList.filter((w) => w.name.toLowerCase() !== cleanName.toLowerCase());
      if (filteredWp.length !== wpList.length) {
        await safeWriteWithBackup(join(dir, "waypoint_follower_list.csv"), serializeStationCsv(filteredWp));
      }
    }

    // 3. ตัดรางที่เกี่ยวข้องทั้งหมดทิ้งออกจาก manual_track.csv
    const filteredTracks = tracks.filter(
      (t) =>
        t.from_node.toLowerCase() !== cleanName.toLowerCase() &&
        t.to_node.toLowerCase() !== cleanName.toLowerCase(),
    );
    await safeWriteWithBackup(join(dir, "manual_track.csv"), serializeTrackCsv(filteredTracks));

    // 4. สั่ง ROS ให้รีโหลด Markers ทันที
    await triggerRosReload();

    return {
      success: true,
      deletedNode: cleanName,
      removedEdges: connectedEdges.length,
    };
  }
}

export const mapManager = new MapManagerService();
