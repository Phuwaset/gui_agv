import { useState, useEffect, useCallback } from "react";
import type { StationData, TrackEdge, MapLayoutData } from "../types/telemetry";

export function useMapLayout(isMoving: boolean = false) {
  const [layout, setLayout] = useState<MapLayoutData>({
    stations: [],
    waypoints: [],
    tracks: [],
  });
  const [activeTab, setActiveTab] = useState<"stations" | "waypoints" | "tracks">("stations");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedNodeName, setSelectedNodeName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: "ok" | "error" | "warn"; message: string } | null>(null);

  // Dangling Edge Modal State
  const [danglingWarning, setDanglingWarning] = useState<{
    nodeName: string;
    connectedEdges: TrackEdge[];
  } | null>(null);

  // 1. ดึงข้อมูล Map Layout (สถานี, Waypoints, ราง)
  const fetchLayout = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/map-layout");
      if (res.ok) {
        const data = (await res.json()) as MapLayoutData;
        const cleanedTracks = (data.tracks || []).filter(
          (t) =>
            t.from_node &&
            t.to_node &&
            t.from_node !== "__DELETED__" &&
            t.to_node !== "__DELETED__",
        );
        setLayout({
          stations: data.stations || [],
          waypoints: data.waypoints || [],
          tracks: cleanedTracks,
        });
      }
    } catch (err: any) {
      console.error("[ERROR] [useMapLayout] Failed to fetch layout:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLayout();
  }, [fetchLayout]);

  // 2. แปลงองศา Yaw -> Quaternion (qz, qw)
  const degreesToQuaternion = (yawDegrees: number) => {
    const rad = (yawDegrees * Math.PI) / 180;
    const qz = Number(Math.sin(rad / 2).toFixed(4));
    const qw = Number(Math.cos(rad / 2).toFixed(4));
    return { qz, qw };
  };

  // 3. แก้ไขข้อมูลในตาราง
  const updateStation = (index: number, field: keyof StationData, value: any) => {
    setLayout((prev) => {
      const next = [...prev.stations];
      const cur = { ...next[index], [field]: value };

      // ถ้าแก้ theta ให้คำนวณ qz, qw อัตโนมัติ
      if (field === "theta") {
        const { qz, qw } = degreesToQuaternion(Number(value) || 0);
        cur.qz = qz;
        cur.qw = qw;
      }
      next[index] = cur;
      return { ...prev, stations: next };
    });
  };

  const addStation = (newStation: StationData) => {
    setLayout((prev) => ({
      ...prev,
      stations: [...prev.stations, newStation],
    }));
  };

  const updateWaypoint = (index: number, field: keyof StationData, value: any) => {
    setLayout((prev) => {
      const next = [...prev.waypoints];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, waypoints: next };
    });
  };

  const addWaypoint = (newWp: StationData) => {
    setLayout((prev) => ({
      ...prev,
      waypoints: [...prev.waypoints, newWp],
    }));
  };

  const updateTrack = (index: number, field: keyof TrackEdge, value: string) => {
    setLayout((prev) => {
      const next = [...prev.tracks];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, tracks: next };
    });
  };

  const addTrack = (newTrack: TrackEdge) => {
    setLayout((prev) => ({
      ...prev,
      tracks: [...prev.tracks, newTrack],
    }));
  };

  const deleteTrack = (index: number) => {
    setLayout((prev) => ({
      ...prev,
      tracks: prev.tracks.filter((_, i) => i !== index),
    }));
  };

  // 4. บันทึกข้อมูลลงดิสก์ & ซิงค์หุ่นยนต์
  const saveAll = async () => {
    if (isMoving) {
      setNotification({
        type: "warn",
        message: "ระบบถูกล็อค: รถกำลังเคลื่อนที่ ห้ามบันทึกผังทางวิ่ง",
      });
      return;
    }

    setIsSaving(true);
    setNotification(null);
    try {
      const [resSt, resWp, resTr] = await Promise.all([
        fetch("/api/stations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(layout.stations),
        }),
        fetch("/api/waypoints", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(layout.waypoints),
        }),
        fetch("/api/tracks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(layout.tracks),
        }),
      ]);

      if (resSt.ok && resWp.ok && resTr.ok) {
        setNotification({
          type: "ok",
          message: "บันทึกข้อมูลและส่งสัญญาณรีโหลดไปยัง ROS สำเร็จเรียบร้อย!",
        });
      } else {
        const err = await resSt.json().catch(() => ({ error: "Save failed" }));
        throw new Error(err.error || "เกิดข้อผิดพลาดในการบันทึก");
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        message: `บันทึกไม่สำเร็จ: ${err.message}`,
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  // 5. ลบโหนดพร้อมตรวจสอบ Dangling Edge (HTTP 409 Conflict)
  const deleteNode = async (nodeName: string, force: boolean = false) => {
    if (isMoving) {
      setNotification({
        type: "warn",
        message: "ระบบถูกล็อค: รถกำลังเคลื่อนที่ ห้ามลบข้อมูลผัง",
      });
      return;
    }

    try {
      const res = await fetch(`/api/node/${encodeURIComponent(nodeName)}?force=${force}`, {
        method: "DELETE",
      });

      if (res.status === 409) {
        // ติด Dangling Edge! เปิด Modal เตือน
        const result = await res.json();
        setDanglingWarning({
          nodeName,
          connectedEdges: result.connectedEdges || [],
        });
        return;
      }

      if (res.ok) {
        setDanglingWarning(null);
        setNotification({
          type: "ok",
          message: `ลบโหนด [${nodeName}] เรียบร้อยแล้ว`,
        });
        await fetchLayout();
      } else {
        const err = await res.json().catch(() => ({ error: "Delete failed" }));
        throw new Error(err.error || "Delete failed");
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        message: `ลบไม่สำเร็จ: ${err.message}`,
      });
    }
  };

  return {
    layout,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    selectedNodeName,
    setSelectedNodeName,
    isLoading,
    isSaving,
    notification,
    danglingWarning,
    setDanglingWarning,
    updateStation,
    addStation,
    updateWaypoint,
    addWaypoint,
    updateTrack,
    addTrack,
    deleteTrack,
    saveAll,
    deleteNode,
    fetchLayout,
  };
}
