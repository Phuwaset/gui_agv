import { useState, useEffect, useCallback } from "react";
import type { StationData, ReadStationResponse } from "../types/telemetry";

export function useStationManager() {
  const [stations, setStations] = useState<StationData[]>([]);
  const [selectedStation, setSelectedStation] = useState<StationData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [actionStatus, setActionStatus] = useState<string>("");

  // Station Queue State (สูงสุด 5 จุดตาม GoStationQueue.srv)
  const [stationQueue, setStationQueue] = useState<string[]>([]);

  // Pick & Place State (Send / Receive ตาม GoStationList.srv)
  const [sendStation, setSendStation] = useState<string>("");
  const [receiveStation, setReceiveStation] = useState<string>("");

  const refreshStations = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/stations");
      if (res.ok) {
        const data = (await res.json()) as ReadStationResponse;
        if (data && data.station_data && data.station_data.length > 0) {
          setStations(data.station_data);
          setSelectedStation((prev) =>
            prev
              ? data.station_data.find((s) => s.name === prev.name) ||
                data.station_data[0]
              : data.station_data[0],
          );
        }
      }
    } catch (err) {
      // Use fallback if rosbridge offline
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStations();
  }, [refreshStations]);

  // 1. Single Station Go
  const sendGoStation = async (targetStation: string) => {
    setActionStatus(`Sending go_station: ${targetStation}...`);
    try {
      const res = await fetch("/api/robot/go-station", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_station: targetStation }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to call go_station");
      setActionStatus(data.status || "Command sent");
      return data;
    } catch (err: any) {
      setActionStatus(`Error: ${err.message}`);
      throw err;
    }
  };

  // 2. Reset Position
  const sendResetPosition = async (targetStation: string) => {
    setActionStatus(`Sending reset_position: ${targetStation}...`);
    try {
      const res = await fetch("/api/robot/reset-position", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_station: targetStation }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset position");
      setActionStatus(data.status || "Reset complete");
      return data;
    } catch (err: any) {
      setActionStatus(`Error: ${err.message}`);
      throw err;
    }
  };

  // 3. Queue Station (Q1 - Q5)
  const sendGoStationQueue = async (queue: string[]) => {
    if (!queue || queue.length === 0) {
      throw new Error("คิวว่างเปล่า กรุณาเลือกสถานีอย่างน้อย 1 จุด");
    }
    setActionStatus(`Sending go_station_queue: [${queue.join(" -> ")}]...`);
    try {
      const res = await fetch("/api/robot/go-station-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start queue");
      setActionStatus(data.status || "Queue started");
      return data;
    } catch (err: any) {
      setActionStatus(`Error: ${err.message}`);
      throw err;
    }
  };

  // 4. Pick & Place (Send & Receive)
  const sendGoStationList = async (sendSt: string, receiveSt: string) => {
    if (!sendSt && !receiveSt) {
      throw new Error("กรุณาเลือกจุดส่ง หรือจุดรับอย่างน้อย 1 จุด");
    }
    setActionStatus(`Sending go_station_list: Send[${sendSt || "None"}] -> Receive[${receiveSt || "None"}]...`);
    try {
      const res = await fetch("/api/robot/go-station-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          send_station: sendSt || "None",
          receive_station: receiveSt || "None",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send station list");
      setActionStatus(data.status || "Station list started");
      return data;
    } catch (err: any) {
      setActionStatus(`Error: ${err.message}`);
      throw err;
    }
  };

  // 5. Command Next Station ("Next")
  const sendNextStation = async () => {
    setActionStatus("Sending command: Next...");
    try {
      const res = await fetch("/api/robot/cmd-req", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "Next" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to trigger Next station");
      setActionStatus(data.status || "Next station commanded");
      // เลื่อนคิวสถานีฝั่งหน้าจอ
      setStationQueue((prev) => prev.slice(1));
      return data;
    } catch (err: any) {
      setActionStatus(`Error: ${err.message}`);
      throw err;
    }
  };

  // 6. Command Cancel Queue ("Cancle Queue")
  const sendCancelQueue = async () => {
    setActionStatus("Sending command: Cancle Queue...");
    try {
      const res = await fetch("/api/robot/cmd-req", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "Cancle Queue" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel queue");
      setActionStatus(data.status || "Queue canceled");
      setStationQueue([]);
      return data;
    } catch (err: any) {
      setActionStatus(`Error: ${err.message}`);
      throw err;
    }
  };

  // 7. Force Cancel Navigation (Abort MoveBase goal + Cancle Queue)
  const sendCancelNavigation = async () => {
    setActionStatus("Cancelling active navigation in move_base...");
    try {
      const res = await fetch("/api/robot/cancel-navigation", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel navigation");
      setActionStatus(data.status || "Navigation canceled");
      setStationQueue([]);
      return data;
    } catch (err: any) {
      setActionStatus(`Error: ${err.message}`);
      throw err;
    }
  };

  // Helper สำหรับจัดการคิวหน้าจอ
  const addToQueue = (stationName: string) => {
    setStationQueue((prev) => {
      if (prev.length >= 5) return prev;
      return [...prev, stationName];
    });
  };

  const removeFromQueue = (index: number) => {
    setStationQueue((prev) => prev.filter((_, i) => i !== index));
  };

  const clearQueue = () => {
    setStationQueue([]);
  };

  return {
    stations,
    selectedStation,
    setSelectedStation,
    isLoading,
    actionStatus,
    refreshStations,
    sendGoStation,
    sendResetPosition,
    // Queue
    stationQueue,
    setStationQueue,
    addToQueue,
    removeFromQueue,
    clearQueue,
    sendGoStationQueue,
    // Pick & Place
    sendStation,
    setSendStation,
    receiveStation,
    setReceiveStation,
    sendGoStationList,
    // Stepper & Cancellation
    sendNextStation,
    sendCancelQueue,
    sendCancelNavigation,
  };
}

