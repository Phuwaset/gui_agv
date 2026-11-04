import { Layers, Lock, Navigation, ShieldAlert, ShieldCheck, Unlock } from "lucide-react";
import type { NavigationStatus, BaseStatus } from "../../types/telemetry";

interface StationCanvasProps {
  nav: NavigationStatus | null;
  base: BaseStatus | null;
  lastUpdated?: string;
}

export function StationCanvas({ nav, base, lastUpdated }: StationCanvasProps) {
  const currentStation = nav?.current_station || "Material Room";
  const isObstacle = nav?.obstacle === "Detecting";

  return (
    <div className="w-full max-w-2xl h-80 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm p-6 relative flex flex-col justify-between shadow-2xl">
      {/* Floor Plan Header */}
      <div className="flex justify-between items-center text-xs text-slate-400 border-b border-slate-800/60 pb-3">
        <span className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-orange-400" />
          AGV / FACTORY LAB (2D LAYOUT)
        </span>
        <span className="font-mono text-emerald-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Chrony Time Sync: OK (0.4ms)
        </span>
      </div>

      {/* Station Markers Line */}
      <div className="flex items-center justify-around my-auto relative">
        {/* Connecting Path line */}
        <div className="absolute top-1/2 left-16 right-16 h-1 bg-gradient-to-r from-orange-500/40 via-sky-500/40 to-slate-800 -translate-y-1/2 z-0" />

        {/* Station A (Material Room) */}
        <div
          className={`relative z-10 flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-300 ${
            currentStation === "Material Room"
              ? "bg-orange-500/10 border-orange-500/50 shadow-lg shadow-orange-500/10"
              : "bg-slate-900/80 border-slate-800"
          }`}
        >
          <div
            className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm ${
              currentStation === "Material Room"
                ? "bg-orange-500 text-white"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            A
          </div>
          <span className="text-xs font-semibold text-slate-200">Material Room</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-orange-400 border border-orange-500/20">
            {currentStation === "Material Room" ? "จุดจอดปัจจุบัน" : "Station A"}
          </span>
        </div>

        {/* Simulated AGV Vehicle Node */}
        <div className="relative z-10 flex flex-col items-center gap-2 animate-bounce">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 border-2 border-orange-400 flex items-center justify-center shadow-xl shadow-orange-500/20">
            <Navigation className="w-7 h-7 text-orange-400 transform rotate-45" />
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
            AMV-01
          </span>
        </div>

        {/* Station B (Line12) */}
        <div
          className={`relative z-10 flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-300 ${
            currentStation === "Line12"
              ? "bg-orange-500/10 border-orange-500/50 shadow-lg shadow-orange-500/10"
              : "bg-slate-900/80 border-slate-800"
          }`}
        >
          <div
            className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm ${
              currentStation === "Line12"
                ? "bg-orange-500 text-white"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            B
          </div>
          <span className="text-xs font-semibold text-slate-200">Line12</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
            Station B
          </span>
        </div>
      </div>

      {/* Mechanism HUD Footer */}
      <div className="flex justify-between items-center pt-3 border-t border-slate-800/60 text-xs">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-slate-400">
            {nav?.pin_lock === "Up" ? (
              <Lock className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Unlock className="w-3.5 h-3.5 text-slate-400" />
            )}
            สลัก Pin: <strong className="text-white">{nav?.pin_lock || "Up"}</strong>
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            {isObstacle ? (
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            )}
            Zone 1:{" "}
            <strong
              className={
                isObstacle ? "text-rose-400 font-bold" : "text-emerald-400"
              }
            >
              {nav?.obstacle || "None"}
            </strong>
          </span>
        </div>
        <span className="text-slate-500 font-mono text-[11px]">
          Heartbeat:{" "}
          {lastUpdated
            ? new Date(lastUpdated).toLocaleTimeString()
            : "--:--:--"}
        </span>
      </div>
    </div>
  );
}

