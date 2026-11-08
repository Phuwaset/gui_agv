import { AlertTriangle, Trash2, X } from "lucide-react";
import type { TrackEdge } from "../../types/telemetry";

interface DanglingEdgeModalProps {
  nodeName: string;
  connectedEdges: TrackEdge[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function DanglingEdgeModal({
  nodeName,
  connectedEdges,
  onConfirm,
  onCancel,
}: DanglingEdgeModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#161b22] border border-rose-300 dark:border-rose-900/60 rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-rose-50 dark:bg-rose-950/30 p-4 border-b border-rose-200 dark:border-rose-900/40 flex items-start justify-between">
          <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              ยืนยันการลบโหนด [{nodeName}] ?
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3 text-sm text-slate-700 dark:text-slate-300">
          <p>
            ระบบตรวจพบว่าโหนดนี้มีเส้นทางเชื่อมโยงอยู่ใน{" "}
            <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-amber-600 dark:text-amber-400 font-mono">
              manual_track.csv
            </code>{" "}
            จำนวน <strong className="text-rose-600 dark:text-rose-400 font-bold">{connectedEdges.length} เส้น</strong>:
          </p>

          <div className="max-h-36 overflow-y-auto bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 space-y-1 font-mono text-xs">
            {connectedEdges.map((e, idx) => (
              <div key={idx} className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">{e.from_node}</span>
                <span className="text-slate-400">{"<───>"}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{e.to_node}</span>
              </div>
            ))}
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-lg text-xs text-amber-800 dark:text-amber-300">
            ⚠️ <strong>Dangling Edge Protection:</strong> หากยืนยันการลบ ระบบจะทำการ{" "}
            <strong>ตัดเส้นทางทั้ง {connectedEdges.length} เส้นนี้ทิ้ง</strong> ออกจากไฟล์ให้อัตโนมัติ เพื่อป้องกันปัญหารางขาดใน ROS Path Planner
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
          >
            ยกเลิก (Cancel)
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-1.5 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            ยืนยันการลบและตัดราง (Confirm & Purge)
          </button>
        </div>
      </div>
    </div>
  );
}
