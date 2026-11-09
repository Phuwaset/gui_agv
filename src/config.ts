const getEnv = (key: string, fallback: string): string => {
  try {
    if (typeof globalThis !== "undefined" && (globalThis as any).process?.env) {
      return (globalThis as any).process.env[key] || fallback;
    }
  } catch {
    // Client browser fallback
  }
  return fallback;
};

export const CONFIG = {
  // React และ Backend API
  PORT: Number(getEnv("PORT", "3000")),

  // IP ของหุ่นยนต์ rosbridge (Default: Local Simulation บนพอร์ต 9090)
  ROBOT_WS_URL: getEnv("ROBOT_WS_URL", "ws://192.168.50.115:9090"),
};

// ข้อมูลพิกัดและสเปกแผนที่โรงงาน
export const MAP_CONFIG = {
  IMAGE_URL: "/api/map/mektec_20260917_remap.png",
  LINUX_PATH:
    "/home/minirw/amv_ws/src/amv_mapping/map/mektec_20260917_remap.png",
  IMAGE_WIDTH: 2304,
  IMAGE_HEIGHT: 1408,
  RESOLUTION: 0.05, // 0.05 m/pixel (1 m = 20 pixels)
  ORIGIN_X: -30.0, // จุดกำเนิดล่างซ้าย (เมตร)
  ORIGIN_Y: -30.0,
  REAL_WIDTH_METERS: 115.2, // กว้าง 2304 * 0.05 = 115.2 m
  REAL_HEIGHT_METERS: 70.4, // สูง 1408 * 0.05 = 70.4 m
};

// ตำแหน่งไฟล์สถานี, Waypoint และรางเดินรถ (Cross-Platform)
export const STATION_CONFIG = {
  LINUX_DIR: "/home/minirw/amv_ws/src/amv_service/station",
  LOCAL_DIR: "./data/station",
};

