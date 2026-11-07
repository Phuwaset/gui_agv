import { useState } from "react";
import { X, Play, RotateCcw, Battery, BatteryCharging, ShieldAlert } from "lucide-react";
import type {
  BaseStatus,
  NavigationStatus,
  RobotPose,
  StationData,
} from "../../types/telemetry";

interface InspectorPanelProps {
  isConnected: boolean;
  nav: NavigationStatus | null;
  base: BaseStatus | null;
  pose: RobotPose | null;
  lastUpdated?: string;
  stations: StationData[];
  selectedStation: StationData | null;
  onSelectStation: (station: StationData) => void;
  onGoStation: (target: string) => Promise<any>;
  onResetPosition: (target: string) => Promise<any>;
  actionStatus?: string;
  onClose: () => void;
}

const DASH = "—";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 text-[13px] border-b border-slate-100 dark:border-slate-800/80">
      <span className="text-slate-500 dark:text-slate-400 font-normal">{label}</span>
      <span className="text-slate-800 dark:text-slate-100 font-medium text-right truncate max-w-[60%]">
        {children}
      </span>
    </div>
  );
}

// Status Switch สไตล์ SYNAOS
function StatusSwitch({ on }: { on: boolean | null }) {
  return (
    <span
      role="switch"
      aria-checked={!!on}
      className={`inline-flex w-9 h-5 rounded-full p-0.5 transition-colors ${
        on === null
          ? "bg-slate-200 dark:bg-slate-700"
          : on
            ? "bg-emerald-500"
            : "bg-slate-300 dark:bg-slate-600"
      }`}
    >
      <span
        className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </span>
  );
}

function getState(
  isConnected: boolean,
  nav: NavigationStatus | null,
  base: BaseStatus | null,
): { text: string; tone: "ok" | "warn" | "error" | "idle" } {
  if (!isConnected) return { text: "Offline / Disconnected", tone: "idle" };
  if (base?.emergency_button) return { text: "Emergency Stop (E-Stop)", tone: "error" };
  if (base?.system_fault)
    return { text: `System fault (${base.system_fault_code})`, tone: "error" };
  if (nav?.obstacle === "Detecting") return { text: "Obstacle Detected (Zone 1)", tone: "warn" };
  if (base?.robot_moving) return { text: "In Motion / Moving", tone: "ok" };
  return { text: "No error reported by AGV", tone: "ok" };
}

const TONE_CLASS = {
  ok: "text-slate-800 dark:text-slate-100",
  warn: "text-amber-600 dark:text-amber-400 font-semibold",
  error: "text-rose-600 dark:text-rose-400 font-semibold",
  idle: "text-slate-400",
} as const;

export function InspectorPanel({
  isConnected,
  nav,
  base,
  pose,
  lastUpdated,
  stations,
  selectedStation,
  onSelectStation,
  onGoStation,
  onResetPosition,
  actionStatus,
  onClose,
}: InspectorPanelProps) {
  const [tab, setTab] = useState<"details" | "order">("details");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const state = getState(isConnected, nav, base);
  const live = isConnected;

  // Hardware-Synced Interlock (ตามกฎความปลอดภัย AGENTS.md)
  const isEmergency = base?.emergency_button === true;
  const isObstacle = nav?.obstacle === "Detecting";
  const isMoving = nav?.navigation_status === "Got path planning";
  const isInterlocked = isEmergency || isObstacle || isMoving;

  const interlockReason = isEmergency
    ? "⚠️ ปิดการสั่งการ: สวิตช์ E-Stop ถูกกด"
    : isObstacle
    ? "⚠️ ปิดการสั่งการ: ตรวจพบสิ่งกีดขวางระยะฉุกเฉิน"
    : isMoving
    ? "⚠️ ปิดการสั่งการ: หุ่นยนต์กำลังวิ่งนำทางอยู่"
    : "";

  const handleLaunchMission = async () => {
    if (!selectedStation) return;
    setIsSubmitting(true);
    try {
      await onGoStation(selectedStation.name);
    } catch (err) {
      console.error("[ERROR] [Inspector] Failed to launch mission:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPosition = async () => {
    if (!selectedStation) return;
    setIsSubmitting(true);
    try {
      await onResetPosition(selectedStation.name);
    } catch (err) {
      console.error("[ERROR] [Inspector] Failed to reset position:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <aside className="w-full lg:w-[350px] shrink-0 h-full flex flex-col bg-white dark:bg-[#0f172a] border-l border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-xl transition-colors select-none z-30">
      {/* 1. Header: AGV-001 (SYNAOS / MINIRW) */}
      <div className="p-5 pb-3 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            AGV-001
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
              }`}
            />
          </h2>
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
            MINIRW • AMV-01
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Tabs: Details / Order (ตรงตาม Reference) */}
      <div className="px-5 flex gap-6 border-b border-slate-200 dark:border-slate-800 text-[13px]">
        <button
          type="button"
          onClick={() => setTab("details")}
          className={`pb-2.5 -mb-px border-b-2 font-semibold transition cursor-pointer ${
            tab === "details"
              ? "border-[#0f1b5c] text-[#0f1b5c] dark:border-sky-400 dark:text-sky-300"
              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          }`}
        >
          Details
        </button>
        <button
          type="button"
          onClick={() => setTab("order")}
          className={`pb-2.5 -mb-px border-b-2 font-semibold transition cursor-pointer ${
            tab === "order"
              ? "border-[#0f1b5c] text-[#0f1b5c] dark:border-sky-400 dark:text-sky-300"
              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          }`}
        >
          Order / Mission
        </button>
      </div>

      {/* 3. Panel Body */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1">
        {tab === "details" ? (
          <div>
            <Row label="AGV Type">SYNAOS-AMV-heavy</Row>
            <Row label="State">
              <span className={TONE_CLASS[state.tone]}>{state.text}</span>
            </Row>
            <Row label="X Position">
              {live && pose ? `${pose.x.toFixed(2)} m` : DASH}
            </Row>
            <Row label="Y Position">
              {live && pose ? `${pose.y.toFixed(2)} m` : DASH}
            </Row>
            <Row label="Heading (Yaw)">
              {live && pose ? `${pose.theta.toFixed(1)}°` : DASH}
            </Row>
            <Row label="End time / Velocity">
              {live && base ? `${base.linear_velocity.toFixed(2)} m/s` : DASH}
            </Row>
            <Row label="In Fleet">
              <StatusSwitch on={live && base ? base.auto_mode : null} />
            </Row>
            <Row label="Loaded (Pin lock)">
              {live && nav?.pin_lock === "Up" ? "Yes (Locked)" : "No (Free)"}
            </Row>
            <Row label="Battery">
              {live && base ? (
                <span className="inline-flex items-center gap-1.5 font-mono">
                  {base.charging ? (
                    <BatteryCharging className="w-4 h-4 text-emerald-500 animate-pulse" />
                  ) : (
                    <Battery className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  )}
                  {base.battery_level}%
                </span>
              ) : (
                DASH
              )}
            </Row>
            <Row label="Current Station">
              {(live && nav?.current_station) || DASH}
            </Row>
            <Row label="Nav Status">
              {(live && nav?.navigation_status) || DASH}
            </Row>
            <Row label="Heartbeat">
              {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : DASH}
            </Row>
          </div>
        ) : (
          <div className="py-2 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Target Station</span>
              <span className="font-mono font-medium">{stations.length} available</span>
            </div>

            <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
              {stations.map((st) => {
                const isSelected = selectedStation?.name === st.name;
                return (
                  <button
                    key={st.name}
                    type="button"
                    onClick={() => onSelectStation(st)}
                    className={`w-full p-2.5 rounded-lg text-left transition border cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "bg-indigo-50 dark:bg-sky-500/10 border-[#0f1b5c] dark:border-sky-400 text-[#0f1b5c] dark:text-sky-300 font-semibold shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-medium">{st.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Pin: {st.pin} | ({st.x.toFixed(1)}, {st.y.toFixed(1)})
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] uppercase font-bold text-sky-500">
                        Selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {isInterlocked && (
              <div className="p-2.5 rounded-lg border border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{interlockReason}</span>
              </div>
            )}

            {actionStatus && (
              <div className="p-2.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                {actionStatus}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Footer Action Buttons (ตรงตาม Reference) */}
      <div className="p-5 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50/50 dark:bg-slate-900/50">
        {tab === "order" && (
          <>
            <button
              type="button"
              disabled={isSubmitting || !isConnected || !selectedStation}
              onClick={handleResetPosition}
              title="Reset position to selected station"
              className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Reset Pose
            </button>
            <button
              type="button"
              disabled={isSubmitting || !isConnected || !selectedStation || isInterlocked}
              onClick={handleLaunchMission}
              title={isInterlocked ? interlockReason : "สั่งหุ่นยนต์วิ่งไปสถานีเป้าหมาย"}
              className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#0f1b5c] hover:bg-[#1a2b85] dark:bg-sky-600 dark:hover:bg-sky-500 transition shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{isSubmitting ? "Sending..." : "Go Station"}</span>
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </aside>
  );
}

export default InspectorPanel;
