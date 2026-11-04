import { useState } from "react";
import {
  Activity,
  Battery,
  BatteryCharging,
  Navigation,
  Play,
  RotateCcw,
  Sun,
} from "lucide-react";
import type { NavigationStatus, BaseStatus } from "../../types/telemetry";

interface ControlCenterProps {
  isConnected: boolean;
  nav: NavigationStatus | null;
  base: BaseStatus | null;
}

export function ControlCenter({ isConnected, nav, base }: ControlCenterProps) {
  const [speedMultiplier, setSpeedMultiplier] = useState<string>("1.0x");
  const [agvLight, setAgvLight] = useState<boolean>(true);
  const [factoryLight, setFactoryLight] = useState<boolean>(true);

  const isEmergency = base?.emergency_button ?? false;
  const isObstacle = nav?.obstacle === "Detecting";

  const getWorkStatusText = () => {
    if (!isConnected) return "ออฟไลน์";
    if (isEmergency) return "หยุดฉุกเฉิน (E-Stop)";
    if (isObstacle) return "พบสิ่งกีดขวาง";
    if (nav?.navigation_status === "Got path planning") return "กำลังวิ่งไปสถานี";
    return "พร้อม";
  };

  return (
    <aside className="w-full lg:w-96 border-l border-slate-800/80 bg-[#0a0f1d] p-6 flex flex-col justify-between overflow-y-auto">
      <div className="space-y-6">
        {/* Header Title */}
        <div>
          <div className="text-[11px] font-mono tracking-wider text-slate-500 uppercase">
            CONTROL CENTER
          </div>
          <div className="flex items-center justify-between mt-1">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              AGV Explorer
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-emerald-400" : "bg-rose-500"
                }`}
              />
            </h3>
            <span className="text-[10px] font-mono text-slate-500">UNIT 01</span>
          </div>
          <p className="text-xs text-slate-400">รถขนส่งอัตโนมัติ • Factory edition</p>
        </div>

        {/* Status Card: สถานะการทำงาน */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-orange-400" />
              สถานะการทำงาน
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              {isConnected ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
          <div className="text-xl font-bold text-white flex items-center gap-2.5 pt-1">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected && !isEmergency
                  ? "bg-emerald-400 animate-pulse"
                  : "bg-rose-500"
              }`}
            />
            {getWorkStatusText()}
          </div>
        </div>

        {/* Battery Status Widget */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              {base?.charging ? (
                <BatteryCharging className="w-4 h-4 text-emerald-400" />
              ) : (
                <Battery className="w-4 h-4 text-amber-400" />
              )}
              ระดับแบตเตอรี่
            </span>
            <span className="font-bold text-white text-base">
              {base?.battery_level ?? 100}%
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${base?.battery_level ?? 100}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-400 flex justify-between pt-1">
            <span>
              โหมด: {base?.auto_mode ? "อัตโนมัติ (Auto)" : "แมนนวล (Manual)"}
            </span>
            <span>{base?.charging ? "กำลังชาร์จไฟ" : "ใช้งานแบตเตอรี่"}</span>
          </div>
        </div>

        {/* Movement / Station Selector */}
        <div className="space-y-3">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-orange-400" />
            การเคลื่อนที่ (Station Selection)
          </span>

          <div className="grid grid-cols-2 gap-2">
            <button className="p-3 rounded-lg border border-orange-500/50 bg-orange-500/10 text-left">
              <div className="text-[10px] text-slate-400">สถานีต้นทาง</div>
              <div className="text-sm font-bold text-white">A (Material Room)</div>
            </button>
            <button className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 text-left hover:border-slate-700">
              <div className="text-[10px] text-slate-400">สถานีปลายทาง</div>
              <div className="text-sm font-bold text-slate-300">B (Line12)</div>
            </button>
          </div>

          <button
            disabled={!isConnected}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-50 transition active:scale-[0.98]"
          >
            <Play className="w-4 h-4 fill-white" />
            เริ่มวิ่งภารกิจ
          </button>
        </div>

        {/* Speed Multiplier Presets */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">ความเร็วในการวิ่ง</span>
            <span className="font-mono text-orange-400 font-bold">
              {speedMultiplier}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {["0.5x", "1.0x", "1.5x"].map((val) => (
              <button
                key={val}
                onClick={() => setSpeedMultiplier(val)}
                className={`py-1.5 text-xs font-mono rounded-md border transition ${
                  speedMultiplier === val
                    ? "bg-slate-800 border-orange-500 text-orange-400 font-bold"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        {/* Hardware Accessory Toggles */}
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-orange-400" /> แสงและบรรยากาศ
          </span>

          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/60 text-xs">
            <span className="text-slate-300">ไฟ AGV</span>
            <button
              onClick={() => setAgvLight(!agvLight)}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
                agvLight ? "bg-orange-500" : "bg-slate-800"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ease-in-out ${
                  agvLight ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/60 text-xs">
            <span className="text-slate-300">ไฟโรงงาน</span>
            <button
              onClick={() => setFactoryLight(!factoryLight)}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
                factoryLight ? "bg-orange-500" : "bg-slate-800"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ease-in-out ${
                  factoryLight ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Reset Position Button */}
        <button className="w-full py-2.5 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition">
          <RotateCcw className="w-3.5 h-3.5" /> เริ่มต้นใหม่ (Reset Position)
        </button>
      </div>

      {/* Footer Branding */}
      <div className="pt-6 border-t border-slate-800/80 text-[11px] text-slate-500 flex justify-between items-center">
        <span>MINIRW Co.,Ltd.</span>
        <span>AMR Series 5 Driver</span>
      </div>
    </aside>
  );
}

