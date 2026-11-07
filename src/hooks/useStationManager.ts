import { useState, useEffect, useCallback } from "react";
import type { StationData, ReadStationResponse } from "../types/telemetry";
export function useStationManager() {
  const [stations, setStations] = useState<StationData[]>([]);
  const [selectedStation, setSelectedStation] = useState<StationData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [actionStatus, setActionStatus] = useState<string>("");

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

  const sendGoStation = async (targetStation: string) => {
    setActionStatus(`Sending go_station: ${targetStation}...`);
    try {
      const res = await fetch("/api/robot/go-station", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_station: targetStation }),
      });
      const data = await res.json();
      setActionStatus(data.status || "Command sent");
      return data;
    } catch (err: any) {
      setActionStatus(`Error: ${err.message}`);
      throw err;
    }
  };

  const sendResetPosition = async (targetStation: string) => {
    setActionStatus(`Sending reset_position: ${targetStation}...`);
    try {
      const res = await fetch("/api/robot/reset-position", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_station: targetStation }),
      });
      const data = await res.json();
      setActionStatus(data.status || "Reset complete");
      return data;
    } catch (err: any) {
      setActionStatus(`Error: ${err.message}`);
      throw err;
    }
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
  };
}

