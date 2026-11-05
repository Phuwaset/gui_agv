import { Eye } from "lucide-react";

interface ViewToolbarProps {
  currentMode: string;
  onSelectMode: (modeId: string) => void;
}

const VIEW_MODES = [
  { id: "overview", label: "ภาพรวม" },
  { id: "close", label: "ใกล้ตัวรถ" },
  { id: "follow", label: "ติดตาม" },
];

export function ViewToolbar({ currentMode, onSelectMode }: ViewToolbarProps) {
  return (
    <div className="relative z-10 flex flex-wrap items-center gap-2">
      <span className="text-xs text-slate-500 mr-2 flex items-center gap-1.5">
        <Eye className="w-3.5 h-3.5" /> มุมมองกล้อง:
      </span>
      {VIEW_MODES.map((btn) => (
        <button
          key={btn.id}
          onClick={() => onSelectMode(btn.id)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition ${
            currentMode === btn.id
              ? "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20 font-medium"
              : "bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white"
          }`}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
