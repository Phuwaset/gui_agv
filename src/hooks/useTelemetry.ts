import { useState, useEffect } from "react";
import type { RobotTelemetry } from "../types/telemetry";

export function useTelemetry(pollIntervalMs: number = 250) {
  const [telemetry, setTelemetry] = useState<RobotTelemetry | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchTelemetry = async () => {
      try {
        // 1. เรียก API ที่พอร์ตตัวเองโดยตรง (ไม่ต้องใส่ localhost:9000 แล้ว)
        const res = await fetch("/api/robot/telemetry");
        if (res.ok && isMounted) {
          const data = (await res.json()) as RobotTelemetry;
          setTelemetry(data);
        }
      } catch (err) {
        if (isMounted) {
          setTelemetry((prev) => (prev ? { ...prev, connected: false } : null));
        }
      }
    };

    fetchTelemetry();
    const timer = setInterval(fetchTelemetry, pollIntervalMs);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [pollIntervalMs]);

  // 2. Safety Watchdog: ถ้าไม่ได้รับสัญญาณใหม่เกิน 3 วินาที = สัญญาณขาด!
  const isHeartbeatLost = telemetry?.lastUpdated
    ? Date.now() - new Date(telemetry.lastUpdated).getTime() > 3000
    : true;

  // หุ่นยนต์จะถือว่า ONLINE จริงๆ ก็ต่อเมื่อต่อติด และ Heartbeat ไม่ขาด
  const isHealthy = (telemetry?.connected ?? false) && !isHeartbeatLost;

  return {
    telemetry,
    isConnected: isHealthy,
    isHeartbeatLost,
    nav: telemetry?.navigation ?? null,
    base: telemetry?.base ?? null,
    pose: telemetry?.pose ?? null,
    plannedPath: telemetry?.plannedPath ?? [],
    stationMarkers: telemetry?.stationMarkers ?? [],
    waypointMarkers: telemetry?.waypointMarkers ?? [],
  };
}
