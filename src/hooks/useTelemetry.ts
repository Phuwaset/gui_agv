import { useState, useEffect } from "react";
import type { RobotTelemetry } from "../types/telemetry";

export function useTelemetry(pollIntervalMs: number = 1000) {
  const [telemetry, setTelemetry] = useState<RobotTelemetry | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchTelemetry = async () => {
      try {
        const res = await fetch("http://localhost:9000/api/robot/telemetry");
        if (res.ok && isMounted) {
          const data = (await res.json()) as RobotTelemetry;
          setTelemetry(data);
        }
      } catch (err) {
        // Silently retain last state or handle connection loss
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

  return {
    telemetry,
    isConnected: telemetry?.connected ?? false,
    nav: telemetry?.navigation ?? null,
    base: telemetry?.base ?? null,
  };
}

