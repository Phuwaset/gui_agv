import { Menu, Zap } from "lucide-react";

export function Header() {
  return (
    <header className="h-14 border-b border-slate-800/80 bg-[#0a0f1d]/90 px-6 flex items-center justify-between backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
          <Zap className="w-4 h-4 text-white fill-white" />
        </div>
        <span className="font-bold tracking-wider text-sm flex items-center gap-1.5">
          AGV <span className="text-slate-500 font-light">/</span>{" "}
          <span className="text-orange-400">STUDIO</span>
        </span>
        <span className="text-xs px-2.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/50 ml-3">
          JOB260803 MEKTEC – Relayout AMR
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1 rounded-md">
          <span className="text-slate-400">FACTORY SHOWROOM</span>
          <span className="text-orange-400 font-mono font-semibold">01</span>
        </div>
        <span className="text-slate-500 hidden md:inline">
          CREATED BY MINIRW Co.,Ltd. v1.0
        </span>
        <button
          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
          aria-label="Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}

