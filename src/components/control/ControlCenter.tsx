import { useState } from "react";
import {
  Compass,
  Crosshair,
  HelpCircle,
  Hexagon,
  Layers,
  Lightbulb,
  Maximize2,
  Navigation,
  Play,
  RotateCcw,
  Share2,
  ShieldCheck,
  Sun,
  X,
  Zap,
} from "lucide-react";
import type {
  NavigationStatus,
  BaseStatus,
  StationData,
} from "../../types/telemetry";

interface ControlCenterProps {
  isConnected: boolean;
  nav: NavigationStatus | null;
  base: BaseStatus | null;
  onClose?: () => void;
  // Offline Studio Process
  isStudioRunning: boolean;
  studioPid?: number;
  isStudioLoading: boolean;
  onToggleStudio: () => void;
  // Station Manager
  stations: StationData[];
  selectedStation: StationData | null;
  onSelectStation: (station: StationData) => void;
  onGoStation: (target: string) => Promise<any>;
  onResetPosition: (target: string) => Promise<any>;
  actionStatus?: string;
  // Camera View Mode
  viewMode?: string;
  onSelectViewMode?: (mode: string) => void;
}

export function ControlCenter({
  isConnected,
  nav,
  base,
  onClose,
  isStudioRunning,
  studioPid,
  isStudioLoading,
  onToggleStudio,
  stations,
  selectedStation,
  onSelectStation,
  onGoStation,
  onResetPosition,
  actionStatus,
  viewMode = "overview",
  onSelectViewMode,
}: ControlCenterProps) {
  const [speedMultiplier, setSpeedMultiplier] = useState<string>("1.0x");
  const [agvLight, setAgvLight] = useState<boolean>(false);
  const [factoryLight, setFactoryLight] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const isEmergency = base?.emergency_button ?? false;
  const isObstacle = nav?.obstacle === "Detecting";

  // Station A & Station B Setup (ตาม Reference Mockup)
  const stationA = stations[0]?.name || "station A";
  const stationB = selectedStation?.name || stations[1]?.name || "station B";

  const getWorkStatusText = () => {
    if (!isConnected) return "ออฟไลน์";
    if (isEmergency) return "หยุดฉุกเฉิน (E-Stop)";
    if (isObstacle) return "ติดสิ่งกีดขวาง";
    if (nav?.navigation_status === "Got path planning" || base?.robot_moving)
      return "กำลังวิ่งภารกิจ";
    return "พร้อม";
  };

  const handleLaunchMission = async () => {
    setIsSubmitting(true);
    try {
      await onGoStation(stationB);
    } catch (err) {
      console.error("[ERROR] [Control] Failed to launch mission:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentSpeed = base?.robot_moving ? "0.38 m/s" : "0.00 m/s";

  return (
    <aside className="w-full lg:w-[380px] bg-[#161b22] border-l border-[#30363d] p-6 flex flex-col justify-between overflow-y-auto space-y-6 select-none shrink-0 text-slate-200">
      <div className="space-y-6">
        {/* 1. Header: CONTROL CENTER / AGV Explorer • */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-mono tracking-widest text-slate-500 uppercase">
            <span>CONTROL CENTER</span>
            {onClose && (
              <button
                onClick={onClose}
                title="ปิดแผงควบคุม"
                className="text-slate-500 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2 mt-1">
            AGV Explorer
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Smart AMR Factory Edition
          </p>
        </div>

        {/* 2. Work Status Card (การ์ดสถานะการทำงาน ตาม Reference 100%) */}
        <div className="p-4 rounded-2xl bg-[#21262d] border border-[#30363d] flex items-center gap-4 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shrink-0">
            <Hexagon className="w-6 h-6 text-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
              สถานะการทำงาน
            </div>
            <div className="text-xl font-bold text-white tracking-tight flex items-center gap-2 mt-0.5">
              <span>{getWorkStatusText()}</span>
              {isConnected && !isEmergency && !isObstacle && (
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              )}
            </div>
          </div>
        </div>

        {/* 3. Station Map & Mission Routing (แผนที่สถานี ตาม Reference 100%) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>แผนที่สถานี</span>
            <Share2 className="w-3.5 h-3.5 text-slate-500" />
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            {/* Box Station A */}
            <div className="p-3 rounded-xl bg-[#21262d] border border-[#30363d] text-center">
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 mb-1">
                A
              </span>
              <div className="text-xs font-semibold text-white truncate">
                {stationA}
              </div>
            </div>

            {/* Connecting Dashed Arrow Line */}
            <div className="flex flex-col items-center justify-center px-1">
              <span className="text-[10px] text-slate-500 font-mono">───</span>
              <span className="text-orange-500 text-xs">⇄</span>
              <span className="text-[10px] text-slate-500 font-mono">───</span>
            </div>

            {/* Box Station B (Selectable) */}
            <div className="p-3 rounded-xl bg-[#21262d] border border-orange-500/50 text-center relative group">
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500 text-white mb-1">
                B
              </span>
              <select
                value={stationB}
                onChange={(e) => {
                  const target = stations.find((s) => s.name === e.target.value);
                  if (target) onSelectStation(target);
                }}
                className="w-full bg-transparent text-xs font-semibold text-white text-center cursor-pointer outline-none truncate"
              >
                {stations.map((s) => (
                  <option key={s.name} value={s.name} className="bg-[#21262d] text-white">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Large Safety Orange CTA Button (เริ่มวิ่งภารกิจ) */}
          <button
            onClick={handleLaunchMission}
            disabled={isSubmitting || !isConnected}
            className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] transition font-bold text-white text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{isSubmitting ? "กำลังส่งคำสั่ง..." : "เริ่มวิ่งภารกิจ"}</span>
          </button>
        </div>

        {/* 4. Speed Multipliers (ความเร็วในการวิ่ง ตาม Reference 100%) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-300">ความเร็วในการวิ่ง</span>
            <span className="font-mono text-orange-400 font-bold">{currentSpeed}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {["0.5x", "1.0x", "1.5x"].map((spd) => (
              <button
                key={spd}
                onClick={() => setSpeedMultiplier(spd)}
                className={`py-2 rounded-xl text-xs font-semibold font-mono transition cursor-pointer border ${
                  speedMultiplier === spd
                    ? "bg-[#21262d] border-orange-500 text-orange-400 shadow-md"
                    : "bg-[#21262d]/60 border-[#30363d] text-slate-400 hover:text-white"
                }`}
              >
                {spd}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 text-center">
            ระบบความเร็วที่ปลอดภัยตามมาตรฐาน ISO
          </p>
        </div>

        {/* 5. Accessories & Lighting (อุปกรณ์เสริมและระบบไฟ ตาม Reference 100%) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>อุปกรณ์เสริมและระบบไฟ</span>
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
          </div>

          {/* Toggle ไฟ AGV */}
          <div className="p-3 rounded-xl bg-[#21262d] border border-[#30363d] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Lightbulb className="w-4 h-4 text-slate-400" />
              <div>
                <div className="text-xs font-medium text-white">ไฟ AGV</div>
                <div className="text-[10px] text-slate-500">ไฟเลี้ยวและไฟส่องทางข้าง</div>
              </div>
            </div>
            <button
              onClick={() => setAgvLight(!agvLight)}
              className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                agvLight ? "bg-orange-500" : "bg-[#30363d]"
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  agvLight ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Toggle ไฟโรงงาน */}
          <div className="p-3 rounded-xl bg-[#21262d] border border-[#30363d] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sun className="w-4 h-4 text-orange-400" />
              <div>
                <div className="text-xs font-medium text-white">ไฟโรงงาน</div>
                <div className="text-[10px] text-slate-500">ไฟแวดล้อม</div>
              </div>
            </div>
            <button
              onClick={() => setFactoryLight(!factoryLight)}
              className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                factoryLight ? "bg-orange-500" : "bg-[#30363d]"
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  factoryLight ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* 6. Camera View Modes (มุมมองกล้อง ตาม Reference 100%) */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-300">มุมมองกล้อง</div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onSelectViewMode?.("overview")}
              className={`py-2.5 px-2 rounded-xl text-xs font-medium flex flex-col items-center gap-1.5 transition cursor-pointer border ${
                viewMode === "overview"
                  ? "bg-orange-500/10 border-orange-500 text-orange-400"
                  : "bg-[#21262d] border-[#30363d] text-slate-400 hover:text-white"
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>ภาพรวม</span>
            </button>

            <button
              onClick={() => onSelectViewMode?.("closeup")}
              className={`py-2.5 px-2 rounded-xl text-xs font-medium flex flex-col items-center gap-1.5 transition cursor-pointer border ${
                viewMode === "closeup"
                  ? "bg-orange-500/10 border-orange-500 text-orange-400"
                  : "bg-[#21262d] border-[#30363d] text-slate-400 hover:text-white"
              }`}
            >
              <Maximize2 className="w-4 h-4" />
              <span>ใกล้ตัวรถ</span>
            </button>

            <button
              onClick={() => onSelectViewMode?.("follow")}
              className={`py-2.5 px-2 rounded-xl text-xs font-medium flex flex-col items-center gap-1.5 transition cursor-pointer border ${
                viewMode === "follow"
                  ? "bg-orange-500/10 border-orange-500 text-orange-400"
                  : "bg-[#21262d] border-[#30363d] text-slate-400 hover:text-white"
              }`}
            >
              <Crosshair className="w-4 h-4" />
              <span>ติดตาม</span>
            </button>
          </div>
        </div>
      </div>

      {/* 7. Footer: AGV Identity Card (บันทึกไว้ ตาม Reference 100%) */}
      <div className="space-y-2 pt-4 border-t border-[#30363d]">
        <div className="text-[11px] font-semibold text-slate-400">บันทึกไว้</div>
        <div className="p-3 rounded-xl bg-[#21262d] border border-[#30363d] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-orange-500/20 text-orange-400 border border-orange-500/30">
              AGV
            </span>
            <div>
              <div className="text-xs font-bold text-white">
                AGV AMV-01 series 5 driver
              </div>
              <div className="text-[10px] text-slate-500">
                รหัสประจำตัวคันที่ 01 (พร้อมใช้งาน)
              </div>
            </div>
          </div>
        </div>

        {/* Discreet Subprocess Indicator */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
          <span>Subprocess Mode:</span>
          <button
            onClick={onToggleStudio}
            disabled={isStudioLoading}
            className={`font-mono font-bold transition cursor-pointer hover:underline ${
              isStudioRunning ? "text-emerald-400" : "text-slate-400"
            }`}
          >
            {isStudioLoading
              ? "กำลังรัน..."
              : isStudioRunning
              ? `ONLINE (PID ${studioPid ?? "OK"})`
              : "INACTIVE (คลิกเพื่อเริ่ม)"}
          </button>
        </div>
      </div>
    </aside>
  );
}

export default ControlCenter;
