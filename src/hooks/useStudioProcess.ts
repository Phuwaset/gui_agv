import { useState, useEffect, useCallback } from "react";

export function useStudioProcess() {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [pid, setPid] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/studio/status");
      if (res.ok) {
        const data = (await res.json()) as { running: boolean; pid?: number };
        setIsRunning(data.running);
        setPid(data.pid);
      }
    } catch (err) {
      // Server may be offline
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(fetchStatus, 3000);
    return () => clearInterval(timer);
  }, [fetchStatus]);

  const toggleStudio = async () => {
    setIsLoading(true);
    try {
      const endpoint = isRunning ? "/api/studio/stop" : "/api/studio/start";
      const res = await fetch(endpoint, { method: "POST" });
      if (res.ok) {
        const data = (await res.json()) as { running: boolean; pid?: number };
        setIsRunning(data.running);
        setPid(data.pid);
      }
    } catch (err) {
      console.error("[ERROR] Failed to toggle studio mode:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isRunning,
    pid,
    isLoading,
    toggleStudio,
  };
}

