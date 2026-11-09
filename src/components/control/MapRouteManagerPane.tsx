import { useState } from "react";
import {
  MapPin,
  Route,
  Waypoints as WaypointsIcon,
  Search,
  Plus,
  Trash2,
  Crosshair,
  Save,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import type { StationData, TrackEdge, MapLayoutData } from "../../types/telemetry";

interface MapRouteManagerPaneProps {
  layout: MapLayoutData;
  activeTab: "stations" | "waypoints" | "tracks";
  onSelectTab: (tab: "stations" | "waypoints" | "tracks") => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedNodeName: string | null;
  onSelectNode: (name: string) => void;
  onUpdateStation: (index: number, field: keyof StationData, val: any) => void;
  onAddStation: (st: StationData) => void;
  onUpdateWaypoint: (index: number, field: keyof StationData, val: any) => void;
  onAddWaypoint: (wp: StationData) => void;
  onUpdateTrack: (index: number, field: keyof TrackEdge, val: string) => void;
  onAddTrack: (tr: TrackEdge) => void;
  onDeleteTrack: (index: number) => void;
  onDeleteNode: (name: string) => void;
  onSaveAll: () => Promise<void>;
  onRefresh: () => void;
  isSaving: boolean;
  isMoving: boolean;
  notification: { type: "ok" | "error" | "warn"; message: string } | null;
}

export function MapRouteManagerPane({
  layout,
  activeTab,
  onSelectTab,
  searchQuery,
  onSearchChange,
  selectedNodeName,
  onSelectNode,
  onUpdateStation,
  onAddStation,
  onUpdateWaypoint,
  onAddWaypoint,
  onUpdateTrack,
  onAddTrack,
  onDeleteTrack,
  onDeleteNode,
  onSaveAll,
  onRefresh,
  isSaving,
  isMoving,
  notification,
}: MapRouteManagerPaneProps) {
  const [newStationName, setNewStationName] = useState("");
  const [newWpName, setNewWpName] = useState("");
  const [newFromNode, setNewFromNode] = useState("");
  const [newToNode, setNewToNode] = useState("");

  // ฟิลเตอร์ข้อมูลตามคำค้นหา (ผูก originalIndex เพื่อให้แก้ไข/ลบตรงตำแหน่งจริงใน layout เสมอ)
  const filteredStations = layout.stations
    .map((station, originalIndex) => ({ station, originalIndex }))
    .filter(({ station }) =>
      station.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  const filteredWaypoints = layout.waypoints
    .map((waypoint, originalIndex) => ({ waypoint, originalIndex }))
    .filter(({ waypoint }) =>
      waypoint.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  const filteredTracks = layout.tracks
    .map((track, originalIndex) => ({ track, originalIndex }))
    .filter(
      ({ track }) =>
        track.from_node.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.to_node.toLowerCase().includes(searchQuery.toLowerCase()),
    );

  const handleAddNewStation = () => {
    const name = newStationName.trim() || `Station_${layout.stations.length + 1}`;
    onAddStation({
      name,
      mode: "Auto",
      timer: 1,
      pin: "Up",
      x: 20.0,
      y: 5.0,
      z: 0.0,
      qx: 0.0,
      qy: 0.0,
      qz: 0.0,
      qw: 1.0,
      theta: 0.0,
    });
    setNewStationName("");
  };

  const handleAddNewWaypoint = () => {
    const name = newWpName.trim() || `wp${layout.waypoints.length + 1}`;
    onAddWaypoint({
      name,
      mode: "Auto",
      timer: 0,
      pin: "Up",
      x: 20.0,
      y: 5.0,
      z: 0.0,
      qx: 0.0,
      qy: 0.0,
      qz: 0.0,
      qw: 1.0,
      theta: 0.0,
    });
    setNewWpName("");
  };

  const handleAddNewTrack = () => {
    if (!newFromNode.trim() || !newToNode.trim()) return;
    onAddTrack({
      from_node: newFromNode.trim(),
      to_node: newToNode.trim(),
      mode: "bidirectional",
    });
    setNewFromNode("");
    setNewToNode("");
  };

  return (
    <aside className="w-full lg:w-[460px] xl:w-[500px] shrink-0 h-full flex flex-col bg-white dark:bg-[#0d1117] border-r border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-lg z-20 overflow-hidden">
      {/* 1. Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-[#161b22]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#0f1b5c] text-white">
            <Route className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
              MAP & ROUTE MANAGER
            </h2>
            <p className="text-[11px] text-slate-400">Mektec Plant Digital Twin</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          title="รีโหลดจากไฟล์"
          className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Tabs: [สถานี] [Waypoints] [ราง] */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold bg-slate-100/60 dark:bg-[#0f141c]">
        <button
          type="button"
          onClick={() => onSelectTab("stations")}
          className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer ${
            activeTab === "stations"
              ? "border-[#f97316] text-[#f97316] bg-white dark:bg-[#161b22]"
              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          สถานี ({layout.stations.length})
        </button>
        <button
          type="button"
          onClick={() => onSelectTab("waypoints")}
          className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer ${
            activeTab === "waypoints"
              ? "border-[#2563eb] text-[#2563eb] bg-white dark:bg-[#161b22]"
              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          }`}
        >
          <WaypointsIcon className="w-3.5 h-3.5" />
          Waypoints ({layout.waypoints.length})
        </button>
        <button
          type="button"
          onClick={() => onSelectTab("tracks")}
          className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer ${
            activeTab === "tracks"
              ? "border-sky-500 text-sky-500 bg-white dark:bg-[#161b22]"
              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          }`}
        >
          <Route className="w-3.5 h-3.5" />
          รางเดินรถ ({layout.tracks.length})
        </button>
      </div>

      {/* 3. Search Bar & Quick Add */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2 bg-white dark:bg-[#161b22]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ค้นหาโหนดหรือราง..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-900 dark:text-white"
          />
        </div>

        {/* Quick Add Form */}
        {activeTab === "stations" && (
          <div className="flex gap-1.5">
            <input
              type="text"
              value={newStationName}
              onChange={(e) => setNewStationName(e.target.value)}
              placeholder="ชื่อสถานีใหม่ (เช่น Mat_02)..."
              className="flex-1 px-2.5 py-1 text-xs bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 rounded-md"
            />
            <button
              type="button"
              disabled={isMoving}
              onClick={handleAddNewStation}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> เพิ่ม
            </button>
          </div>
        )}

        {activeTab === "waypoints" && (
          <div className="flex gap-1.5">
            <input
              type="text"
              value={newWpName}
              onChange={(e) => setNewWpName(e.target.value)}
              placeholder="ชื่อ Waypoint (เช่น wp18)..."
              className="flex-1 px-2.5 py-1 text-xs bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 rounded-md"
            />
            <button
              type="button"
              disabled={isMoving}
              onClick={handleAddNewWaypoint}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> เพิ่ม
            </button>
          </div>
        )}

        {activeTab === "tracks" && (
          <div className="flex gap-1.5">
            <input
              type="text"
              value={newFromNode}
              onChange={(e) => setNewFromNode(e.target.value)}
              placeholder="จากโหนด..."
              className="w-1/3 px-2 py-1 text-xs bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 rounded-md"
            />
            <input
              type="text"
              value={newToNode}
              onChange={(e) => setNewToNode(e.target.value)}
              placeholder="ไปยังโหนด..."
              className="w-1/3 px-2 py-1 text-xs bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 rounded-md"
            />
            <button
              type="button"
              disabled={isMoving}
              onClick={handleAddNewTrack}
              className="flex-1 py-1 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-md text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> เชื่อมราง
            </button>
          </div>
        )}
      </div>

      {/* 4. Table Body */}
      <div className="flex-1 overflow-y-auto">
        {/* 4.1 Stations Table */}
        {activeTab === "stations" && (
          <table className="w-full text-left border-collapse text-[11px]">
            <thead className="sticky top-0 bg-slate-100 dark:bg-[#161b22] text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider z-10 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2 px-2.5">Name</th>
                <th className="py-2 px-1 text-right">X(m)</th>
                <th className="py-2 px-1 text-right">Y(m)</th>
                <th className="py-2 px-1 text-right">Yaw(°)</th>
                <th className="py-2 px-1 text-center">Pin</th>
                <th className="py-2 px-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {filteredStations.map(({ station: st, originalIndex }) => {
                const isSelected = selectedNodeName === st.name;
                return (
                  <tr
                    key={st.name || originalIndex}
                    className={`transition hover:bg-amber-500/5 ${
                      isSelected ? "bg-amber-500/15 dark:bg-amber-500/20 font-semibold" : ""
                    }`}
                  >
                    <td className="py-1.5 px-2.5 font-sans font-medium text-slate-800 dark:text-slate-100">
                      <input
                        type="text"
                        disabled={isMoving}
                        value={st.name}
                        onChange={(e) => onUpdateStation(originalIndex, "name", e.target.value)}
                        className="w-24 px-1 py-0.5 bg-transparent border-b border-transparent focus:border-amber-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-1.5 px-1 text-right">
                      <input
                        type="number"
                        step="0.05"
                        disabled={isMoving}
                        value={st.x}
                        onChange={(e) => onUpdateStation(originalIndex, "x", parseFloat(e.target.value) || 0)}
                        className="w-14 px-1 py-0.5 text-right bg-transparent border-b border-transparent focus:border-amber-500 focus:outline-none text-slate-600 dark:text-slate-300"
                      />
                    </td>
                    <td className="py-1.5 px-1 text-right">
                      <input
                        type="number"
                        step="0.05"
                        disabled={isMoving}
                        value={st.y}
                        onChange={(e) => onUpdateStation(originalIndex, "y", parseFloat(e.target.value) || 0)}
                        className="w-14 px-1 py-0.5 text-right bg-transparent border-b border-transparent focus:border-amber-500 focus:outline-none text-slate-600 dark:text-slate-300"
                      />
                    </td>
                    <td className="py-1.5 px-1 text-right">
                      <input
                        type="number"
                        step="1"
                        disabled={isMoving}
                        value={st.theta ?? 0}
                        onChange={(e) => onUpdateStation(originalIndex, "theta", parseFloat(e.target.value) || 0)}
                        className="w-12 px-1 py-0.5 text-right bg-transparent border-b border-transparent focus:border-amber-500 focus:outline-none text-amber-600 dark:text-amber-400 font-semibold"
                      />
                    </td>
                    <td className="py-1.5 px-1 text-center">
                      <select
                        disabled={isMoving}
                        value={st.pin}
                        onChange={(e) => onUpdateStation(originalIndex, "pin", e.target.value)}
                        className="text-[10px] bg-slate-100 dark:bg-slate-800 rounded px-1 py-0.5 border border-slate-200 dark:border-slate-700"
                      >
                        <option value="Up">Up</option>
                        <option value="Down">Down</option>
                      </select>
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onSelectNode(st.name)}
                          title="ไฮไลท์บนแผนที่"
                          className="p-1 hover:text-amber-600 text-slate-400 transition cursor-pointer"
                        >
                          <Crosshair className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isMoving}
                          onClick={() => onDeleteNode(st.name)}
                          title="ลบสถานีนี้"
                          className="p-1 hover:text-rose-600 disabled:opacity-30 text-slate-400 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* 4.2 Waypoints Table */}
        {activeTab === "waypoints" && (
          <table className="w-full text-left border-collapse text-[11px]">
            <thead className="sticky top-0 bg-slate-100 dark:bg-[#161b22] text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider z-10 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2 px-3">Waypoint</th>
                <th className="py-2 px-2 text-right">X(m)</th>
                <th className="py-2 px-2 text-right">Y(m)</th>
                <th className="py-2 px-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {filteredWaypoints.map(({ waypoint: wp, originalIndex }) => {
                const isSelected = selectedNodeName === wp.name;
                return (
                  <tr
                    key={wp.name || originalIndex}
                    className={`transition hover:bg-blue-500/5 ${
                      isSelected ? "bg-blue-500/15 dark:bg-blue-500/20 font-semibold" : ""
                    }`}
                  >
                    <td className="py-1.5 px-3 font-semibold text-blue-600 dark:text-blue-400">
                      <input
                        type="text"
                        disabled={isMoving}
                        value={wp.name}
                        onChange={(e) => onUpdateWaypoint(originalIndex, "name", e.target.value)}
                        className="w-28 px-1 py-0.5 bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      <input
                        type="number"
                        step="0.05"
                        disabled={isMoving}
                        value={wp.x}
                        onChange={(e) => onUpdateWaypoint(originalIndex, "x", parseFloat(e.target.value) || 0)}
                        className="w-16 px-1 py-0.5 text-right bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none text-slate-600 dark:text-slate-300"
                      />
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      <input
                        type="number"
                        step="0.05"
                        disabled={isMoving}
                        value={wp.y}
                        onChange={(e) => onUpdateWaypoint(originalIndex, "y", parseFloat(e.target.value) || 0)}
                        className="w-16 px-1 py-0.5 text-right bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none text-slate-600 dark:text-slate-300"
                      />
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onSelectNode(wp.name)}
                          title="ไฮไลท์บนแผนที่"
                          className="p-1 hover:text-blue-600 text-slate-400 transition cursor-pointer"
                        >
                          <Crosshair className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isMoving}
                          onClick={() => onDeleteNode(wp.name)}
                          title="ลบ Waypoint นี้"
                          className="p-1 hover:text-rose-600 disabled:opacity-30 text-slate-400 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* 4.3 Tracks Table */}
        {activeTab === "tracks" && (
          <table className="w-full text-left border-collapse text-[11px]">
            <thead className="sticky top-0 bg-slate-100 dark:bg-[#161b22] text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider z-10 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2 px-3">From Node</th>
                <th className="py-2 px-2 text-center">───</th>
                <th className="py-2 px-3">To Node</th>
                <th className="py-2 px-2">Mode</th>
                <th className="py-2 px-2 text-center">Del</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {filteredTracks.map(({ track: tr, originalIndex }) => (
                <tr key={originalIndex} className="transition hover:bg-sky-500/5">
                  <td className="py-1.5 px-3">
                    <input
                      type="text"
                      disabled={isMoving}
                      value={tr.from_node}
                      onChange={(e) => onUpdateTrack(originalIndex, "from_node", e.target.value)}
                      className="w-24 px-1 py-0.5 bg-transparent border-b border-transparent focus:border-sky-500 focus:outline-none text-slate-700 dark:text-slate-300 font-medium"
                    />
                  </td>
                  <td className="py-1.5 px-2 text-center text-slate-400">{"<─>"}</td>
                  <td className="py-1.5 px-3">
                    <input
                      type="text"
                      disabled={isMoving}
                      value={tr.to_node}
                      onChange={(e) => onUpdateTrack(originalIndex, "to_node", e.target.value)}
                      className="w-24 px-1 py-0.5 bg-transparent border-b border-transparent focus:border-sky-500 focus:outline-none text-slate-700 dark:text-slate-300 font-medium"
                    />
                  </td>
                  <td className="py-1.5 px-2 text-slate-500">
                    <select
                      disabled={isMoving}
                      value={tr.mode}
                      onChange={(e) => onUpdateTrack(originalIndex, "mode", e.target.value)}
                      className="text-[10px] bg-slate-100 dark:bg-slate-800 rounded px-1 py-0.5 border border-slate-200 dark:border-slate-700"
                    >
                      <option value="bidirectional">2 ทาง</option>
                      <option value="forward">ทางเดียว</option>
                    </select>
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    <button
                      type="button"
                      disabled={isMoving}
                      onClick={() => onDeleteTrack(originalIndex)}
                      title="ลบรางเดินรถนี้"
                      className="p-1 hover:text-rose-600 disabled:opacity-30 text-slate-400 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 5. Notification Toast */}
      {notification && (
        <div
          className={`px-4 py-2 text-xs font-semibold flex items-center gap-2 transition ${
            notification.type === "ok"
              ? "bg-emerald-500 text-white"
              : notification.type === "warn"
              ? "bg-amber-500 text-white"
              : "bg-rose-500 text-white"
          }`}
        >
          {notification.type === "ok" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* 6. Bottom Safety Banner & Save Button */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#161b22] space-y-2">
        {/* Safety Interlock Banner */}
        {isMoving ? (
          <div className="p-2 rounded bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
            <span>⚠️ ระบบถูกล็อค: รถกำลังเคลื่อนที่ ห้ามแก้ไขผังทางวิ่ง</span>
          </div>
        ) : (
          <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>สถานะความปลอดภัย: หุ่นยนต์จอดสนิท (พร้อมแก้ไขผัง)</span>
          </div>
        )}

        <button
          type="button"
          disabled={isMoving || isSaving}
          onClick={onSaveAll}
          className="w-full py-2.5 px-4 rounded-lg bg-[#0f1b5c] hover:bg-[#162780] dark:bg-sky-600 dark:hover:bg-sky-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              กำลังบันทึกลงดิสก์ & แจ้งเตือน ROS...
            </span>
          ) : (
            <>
              <Save className="w-4 h-4" />
              บันทึกลงดิสก์ & ซิงค์หุ่นยนต์ (Save & Sync)
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
