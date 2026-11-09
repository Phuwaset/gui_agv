import { useState } from "react";
import {
  X,
  Play,
  RotateCcw,
  Battery,
  BatteryCharging,
  ShieldAlert,
  ListOrdered,
  ArrowRight,
  Trash2,
  Plus,
  SkipForward,
  Ban,
  PackageCheck,
  Check,
} from "lucide-react";
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
  waypoints?: StationData[];
  selectedStation: StationData | null;
  onSelectStation: (station: StationData) => void;
  onGoStation: (target: string) => Promise<any>;
  onResetPosition: (target: string) => Promise<any>;
  // Queue & Pick & Place Props
  stationQueue: string[];
  onAddToQueue: (stationName: string) => void;
  onRemoveFromQueue: (index: number) => void;
  onClearQueue: () => void;
  onGoStationQueue: (queue: string[]) => Promise<any>;
  sendStation: string;
  onSelectSendStation: (st: string) => void;
  receiveStation: string;
  onSelectReceiveStation: (st: string) => void;
  onGoStationList: (sendStation: string, receiveStation: string) => Promise<any>;
  onNextStation: () => Promise<any>;
  onCancelQueue: () => Promise<any>;
  onCancelNavigation: () => Promise<any>;
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
  waypoints = [],
  selectedStation,
  onSelectStation,
  onGoStation,
  onResetPosition,
  stationQueue,
  onAddToQueue,
  onRemoveFromQueue,
  onClearQueue,
  onGoStationQueue,
  sendStation,
  onSelectSendStation,
  receiveStation,
  onSelectReceiveStation,
  onGoStationList,
  onNextStation,
  onCancelQueue,
  onCancelNavigation,
  actionStatus,
  onClose,
}: InspectorPanelProps) {
  const [tab, setTab] = useState<"details" | "order">("details");
  const [orderMode, setOrderMode] = useState<"single" | "queue" | "list">("single");
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

  // 1. Single Mission
  const handleLaunchSingle = async () => {
    if (!selectedStation) return;
    setIsSubmitting(true);
    try {
      await onGoStation(selectedStation.name);
    } catch (err) {
      console.error("[ERROR] [Inspector] Failed to launch single mission:", err);
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

  // 2. Queue Mission (Q1-Q5)
  const handleLaunchQueue = async () => {
    if (stationQueue.length === 0) return;
    setIsSubmitting(true);
    try {
      await onGoStationQueue(stationQueue);
    } catch (err) {
      console.error("[ERROR] [Inspector] Failed to start queue:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextStation = async () => {
    setIsSubmitting(true);
    try {
      await onNextStation();
    } catch (err) {
      console.error("[ERROR] [Inspector] Failed to command Next station:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelQueue = async () => {
    setIsSubmitting(true);
    try {
      await onCancelQueue();
    } catch (err) {
      console.error("[ERROR] [Inspector] Failed to cancel queue:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Pick & Place Mission (Send & Receive)
  const handleLaunchPickPlace = async () => {
    if (!sendStation && !receiveStation) return;
    setIsSubmitting(true);
    try {
      await onGoStationList(sendStation, receiveStation);
    } catch (err) {
      console.error("[ERROR] [Inspector] Failed to start pick & place:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <aside className="w-full lg:w-[370px] shrink-0 h-full flex flex-col bg-white dark:bg-[#0f172a] border-l border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-xl transition-colors select-none z-30">
      {/* 1. Header: AGV-001 (SYNAOS / MINIRW) */}
      <div className="p-4 pb-2 flex items-start justify-between">
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

      {/* 2. Primary Tabs: Details / Order */}
      <div className="px-4 flex gap-6 border-b border-slate-200 dark:border-slate-800 text-[13px]">
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
          className={`pb-2.5 -mb-px border-b-2 font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            tab === "order"
              ? "border-[#0f1b5c] text-[#0f1b5c] dark:border-sky-400 dark:text-sky-300"
              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          }`}
        >
          <span>Order / Mission</span>
          {stationQueue.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-sky-500 text-white text-[9px] flex items-center justify-center font-bold">
              {stationQueue.length}
            </span>
          )}
        </button>
      </div>

      {/* 3. Panel Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
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
          <div className="space-y-3">
            {/* Sub-Mode Segmented Selector: Single / Queue / Pick & Place */}
            <div className="flex bg-slate-100 dark:bg-slate-900/80 p-1 rounded-lg gap-1 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setOrderMode("single")}
                className={`flex-1 py-1.5 rounded-md text-center transition cursor-pointer flex items-center justify-center gap-1 ${
                  orderMode === "single"
                    ? "bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <span>เดี่ยว (Single)</span>
              </button>
              <button
                type="button"
                onClick={() => setOrderMode("queue")}
                className={`flex-1 py-1.5 rounded-md text-center transition cursor-pointer flex items-center justify-center gap-1 ${
                  orderMode === "queue"
                    ? "bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <span>คิว (Queue)</span>
                {stationQueue.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-sky-500 text-white text-[9px] flex items-center justify-center font-bold">
                    {stationQueue.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setOrderMode("list")}
                className={`flex-1 py-1.5 rounded-md text-center transition cursor-pointer flex items-center justify-center gap-1 ${
                  orderMode === "list"
                    ? "bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <span>รับ-ส่ง (List)</span>
              </button>
            </div>

            {/* Hardware Interlock Banner */}
            {isInterlocked && (
              <div className="p-2.5 rounded-lg border border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate">
                  <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="truncate">{interlockReason}</span>
                </div>
                {isMoving && (
                  <button
                    type="button"
                    onClick={async () => {
                      setIsSubmitting(true);
                      try {
                        await onCancelNavigation();
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={isSubmitting}
                    className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] shrink-0 transition cursor-pointer shadow-xs disabled:opacity-50"
                    title="ยกเลิกเป้าหมายใน move_base ทันทีและปลดล็อคสถานะการวิ่ง"
                  >
                    ปลดล็อค / หยุดวิ่ง
                  </button>
                )}
              </div>
            )}

            {/* Status Message from ROS Service */}
            {actionStatus && (
              <div className="p-2.5 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping shrink-0" />
                <span className="truncate">{actionStatus}</span>
              </div>
            )}

            {/* ============================================================ */}
            {/* SUB-MODE 1: SINGLE STATION OR WAYPOINT                       */}
            {/* ============================================================ */}
            {orderMode === "single" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>เลือกเป้าหมายเดี่ยว (สถานี / Waypoint)</span>
                  <div className="flex items-center gap-1 font-mono text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">
                      {stations.length} สถานี
                    </span>
                    {waypoints.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold">
                        {waypoints.length} WP
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                  {/* 1. รายการสถานีหลัก */}
                  {stations.map((st) => {
                    const isSelected = selectedStation?.name === st.name;
                    return (
                      <button
                        key={st.name}
                        type="button"
                        onClick={() => onSelectStation(st)}
                        className={`w-full p-2.5 rounded-lg text-left transition border cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "bg-amber-50 dark:bg-amber-500/10 border-[#0f1b5c] dark:border-amber-400 text-[#0f1b5c] dark:text-amber-200 font-semibold shadow-sm"
                            : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        <div>
                          <div className="text-xs font-medium flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                            <span>{st.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Pin: {st.pin} | ({st.x.toFixed(1)}, {st.y.toFixed(1)})
                          </div>
                        </div>
                        {isSelected && (
                          <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">
                            Selected
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* 2. รายการ Waypoints (สำหรับเลือกทดสอบ Go Station ไปยัง Waypoint เช่น wp18) */}
                  {waypoints.map((wp) => {
                    const isSelected = selectedStation?.name === wp.name;
                    return (
                      <button
                        key={wp.name}
                        type="button"
                        onClick={() => onSelectStation(wp)}
                        className={`w-full p-2.5 rounded-lg text-left transition border cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "bg-blue-50 dark:bg-blue-500/10 border-blue-500 text-blue-900 dark:text-blue-200 font-semibold shadow-sm"
                            : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        <div>
                          <div className="text-xs font-medium flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                            <span>{wp.name}</span>
                            <span className="text-[9px] px-1 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
                              Waypoint
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            พิกัด: ({wp.x.toFixed(2)}, {wp.y.toFixed(2)})
                          </div>
                        </div>
                        {isSelected && (
                          <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400">
                            Selected
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* SUB-MODE 2: STATION QUEUE (Q1 - Q5)                          */}
            {/* ============================================================ */}
            {orderMode === "queue" && (
              <div className="space-y-3">
                {/* Active Queue Slot Visualization */}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <ListOrdered className="w-3.5 h-3.5 text-sky-500" />
                      คิวเป้าหมาย ({stationQueue.length}/5)
                    </span>
                    {stationQueue.length > 0 && (
                      <button
                        type="button"
                        onClick={onClearQueue}
                        className="text-[11px] text-rose-500 hover:text-rose-600 flex items-center gap-1 transition cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>ล้างคิว</span>
                      </button>
                    )}
                  </div>

                  {stationQueue.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                      คิวว่างเปล่า — กด [+] ด้านล่างเพื่อเพิ่มสถานีเข้าคิว
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {stationQueue.map((stName, idx) => {
                        const stObj = stations.find((s) => s.name === stName);
                        return (
                          <div
                            key={`${stName}-${idx}`}
                            className="flex items-center justify-between p-2 rounded-md bg-white dark:bg-slate-800/80 border border-sky-300 dark:border-sky-500/30 text-xs shadow-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded bg-sky-500 text-white font-mono font-bold text-[10px]">
                                Q{idx + 1}
                              </span>
                              <span className="font-semibold text-slate-800 dark:text-slate-100">
                                {stName}
                              </span>
                              {stObj && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ({stObj.pin})
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => onRemoveFromQueue(idx)}
                              className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition cursor-pointer"
                              title="ลบออกจากคิว"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Station Selection List for Queue */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>คลิกเพื่อเพิ่มเข้าคิว:</span>
                    <span className="text-[10px] text-slate-400">
                      {stationQueue.length >= 5 ? "คิวเต็มแล้ว (5/5)" : "เลือกได้อีก " + (5 - stationQueue.length) + " จุด"}
                    </span>
                  </div>

                  <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
                    {stations.map((st) => {
                      const countInQueue = stationQueue.filter((q) => q === st.name).length;
                      const isFull = stationQueue.length >= 5;
                      return (
                        <button
                          key={st.name}
                          type="button"
                          disabled={isFull}
                          onClick={() => onAddToQueue(st.name)}
                          className={`w-full p-2 rounded-lg text-left transition border cursor-pointer flex items-center justify-between ${
                            countInQueue > 0
                              ? "bg-sky-50/50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800/50 text-slate-800 dark:text-slate-200"
                              : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          } ${isFull ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <div>
                            <div className="text-xs font-medium">{st.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Pin: {st.pin} | ({st.x.toFixed(1)}, {st.y.toFixed(1)})
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {countInQueue > 0 && (
                              <span className="px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 text-[10px] font-bold">
                                {countInQueue}x
                              </span>
                            )}
                            <Plus className="w-4 h-4 text-sky-500" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* SUB-MODE 3: PICK & PLACE (SEND & RECEIVE)                    */}
            {/* ============================================================ */}
            {orderMode === "list" && (
              <div className="space-y-3">
                <div className="p-2.5 rounded-lg bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/40 text-xs text-sky-800 dark:text-sky-200">
                  <div className="font-semibold flex items-center gap-1.5 mb-1">
                    <PackageCheck className="w-4 h-4 text-sky-500" />
                    <span>ภารกิจรับ-ส่งชิ้นงาน (GoStationList)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    หุ่นยนต์จะวิ่งไปส่งของที่จุดส่ง (Pin Down) ก่อน จากนั้นจะวิ่งไปรับของที่จุดรับ (Pin Up) อัตโนมัติ
                  </p>
                </div>

                {/* 1. จุดส่งชิ้นงาน (Send Station) */}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      1. จุดส่งชิ้นงาน (Send Station)
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white font-mono text-[9px] font-bold">
                      Pin: Down
                    </span>
                  </div>
                  <select
                    value={sendStation}
                    onChange={(e) => onSelectSendStation(e.target.value)}
                    className="w-full p-2 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 cursor-pointer"
                  >
                    <option value="">-- เลือกจุดส่ง (หรือปล่อย None) --</option>
                    {stations.map((st) => (
                      <option key={`send-${st.name}`} value={st.name}>
                        {st.name} (Pin: {st.pin})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Connection Arrow */}
                <div className="flex items-center justify-center text-slate-400 text-xs gap-1 font-mono">
                  <span>↓ นำส่งเสร็จสิ้น แล้วมุ่งหน้าไปรับของ ↓</span>
                </div>

                {/* 2. จุดรับชิ้นงาน (Receive Station) */}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      2. จุดรับชิ้นงาน (Receive Station)
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white font-mono text-[9px] font-bold">
                      Pin: Up
                    </span>
                  </div>
                  <select
                    value={receiveStation}
                    onChange={(e) => onSelectReceiveStation(e.target.value)}
                    className="w-full p-2 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 cursor-pointer"
                  >
                    <option value="">-- เลือกจุดรับ (หรือปล่อย None) --</option>
                    {stations.map((st) => (
                      <option key={`recv-${st.name}`} value={st.name}>
                        {st.name} (Pin: {st.pin})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Summary Box */}
                {(sendStation || receiveStation) && (
                  <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                      {sendStation || "None"}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {receiveStation || "None"}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Footer Action Buttons (Contextual based on Active Sub-Mode) */}
      <div className="p-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/50">
        {tab === "order" ? (
          <>
            {orderMode === "single" && (
              <>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={isSubmitting || !isConnected || !selectedStation}
                    onClick={handleResetPosition}
                    title="Reset position to selected station"
                    className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Reset Pose
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting || !isConnected || !selectedStation || isInterlocked}
                    onClick={handleLaunchSingle}
                    title={isInterlocked ? interlockReason : "สั่งหุ่นยนต์วิ่งไปสถานีเป้าหมาย"}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#0f1b5c] hover:bg-[#1a2b85] dark:bg-sky-600 dark:hover:bg-sky-500 transition shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>{isSubmitting ? "Sending..." : "Go Station"}</span>
                  </button>
                </div>
              </>
            )}

            {orderMode === "queue" && (
              <>
                {/* Abort / Cancel Queue is ALWAYS permitted even during movement */}
                <button
                  type="button"
                  disabled={isSubmitting || !isConnected}
                  onClick={handleCancelQueue}
                  title="ส่งคำสั่ง 'Cancle Queue' เพื่อหยุดและเคลียร์คิวทั้งหมดใน ROS"
                  className="px-2.5 py-2 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer disabled:opacity-40 flex items-center gap-1"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Cancel Queue</span>
                </button>

                <div className="flex items-center gap-1.5">
                  {/* Step to Next station in Queue */}
                  <button
                    type="button"
                    disabled={isSubmitting || !isConnected || isMoving}
                    onClick={handleNextStation}
                    title={isMoving ? "ไม่สามารถกด Next ได้ขณะหุ่นยนต์กำลังวิ่ง" : "สั่งไปสถานีถัดไปในคิว ('Next')"}
                    className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 transition cursor-pointer disabled:opacity-40 flex items-center gap-1"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    <span>Next</span>
                  </button>

                  {/* Start initial Queue */}
                  <button
                    type="button"
                    disabled={isSubmitting || !isConnected || stationQueue.length === 0 || isInterlocked}
                    onClick={handleLaunchQueue}
                    title={isInterlocked ? interlockReason : "สั่งหุ่นยนต์เริ่มวิ่งตามลำดับคิว"}
                    className="px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 transition shadow-md cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>{isSubmitting ? "Starting..." : "Start Queue"}</span>
                  </button>
                </div>
              </>
            )}

            {orderMode === "list" && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    isSubmitting ||
                    !isConnected ||
                    (!sendStation && !receiveStation) ||
                    isInterlocked
                  }
                  onClick={handleLaunchPickPlace}
                  title={isInterlocked ? interlockReason : "สั่งหุ่นยนต์เริ่มงานรับ-ส่งชิ้นงาน"}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-md cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>{isSubmitting ? "Starting..." : "Start Pick & Place"}</span>
                </button>
              </>
            )}
          </>
        ) : (
          <div className="w-full flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

export default InspectorPanel;
