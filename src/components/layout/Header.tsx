import { useState } from "react";
import {
  ExternalLink,
  Layers,
  Maximize2,
  Menu,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  Radio,
  Sliders,
  X,
  Zap,
} from "lucide-react";

import { Button } from "../ui/button";

interface HeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isConnected?: boolean;
}

export function Header({
  isSidebarOpen,
  onToggleSidebar,
  isConnected = false,
}: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  return (
    <>
      <header className="h-14 border-b border-[#30363d] bg-[#161b22] px-6 flex items-center justify-between sticky top-0 z-50">
        {/* Left: Branding & Job Info */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/40 flex items-center justify-center">
            <Zap className="w-4 h-4 text-orange-500 fill-orange-500" />
          </div>
          <span className="font-extrabold tracking-wider text-sm flex items-center gap-1.5 text-white">
            AGV <span className="text-slate-500 font-light">/</span>{" "}
            <span className="text-orange-500">STUDIO</span>
          </span>
        </div>

        {/* Center: Showroom Info */}
        <div className="hidden md:flex items-center gap-2 bg-[#21262d] border border-[#30363d] px-3.5 py-1 rounded-lg text-xs text-slate-300">
          <span className="text-slate-400 font-medium">FACTORY SHOWROOM</span>
          <span className="text-orange-400 font-mono font-bold">(2)</span>
        </div>

        {/* Right: Quick Indicators & Controls */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-500 hidden xl:inline font-medium">
            CREATED BY MINIRW Co.,Ltd.
          </span>

          {/* Quick Sidebar Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleSidebar}
            title={isSidebarOpen ? "พับเก็บแผงควบคุม" : "เปิดแผงควบคุม"}
            className="hidden md:flex items-center gap-1.5 h-8 bg-[#21262d] border-[#30363d] hover:border-slate-600 text-slate-300 hover:text-white"
          >
            {isSidebarOpen ? (
              <>
                <PanelRightClose className="w-3.5 h-3.5 text-orange-400" />
                <span>พับแผงควบคุม</span>
              </>
            ) : (
              <>
                <PanelRightOpen className="w-3.5 h-3.5 text-emerald-400" />
                <span>เปิดแผงควบคุม</span>
              </>
            )}
          </Button>

          {/* Hamburger Menu Toggle Button */}
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`border transition ${
              isMenuOpen
                ? "bg-orange-500/10 border-orange-500/50 text-orange-400"
                : "bg-[#21262d] border-[#30363d] text-slate-400 hover:text-white hover:border-slate-600"
            }`}
            aria-label="Toggle Navigation Menu"
          >
            {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>
      </header>

      {/* Collapsible Dropdown / Drawer Menu */}
      {isMenuOpen && (
        <div className="fixed inset-x-0 top-14 bg-[#0a0f1d]/95 backdrop-blur-xl border-b border-slate-800 shadow-2xl z-40 p-6 animate-in slide-in-from-top-2 duration-200">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1: Workspace & Views */}
            <div className="space-y-3">
              <div className="text-[11px] font-mono tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-orange-400" /> การจัดการหน้าจอ (Layout & Views)
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    onToggleSidebar();
                    setIsMenuOpen(false);
                  }}
                  className="w-full p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-orange-500/50 flex items-center justify-between text-xs text-slate-200 transition group text-left"
                >
                  <span className="flex items-center gap-2.5">
                    <Sliders className="w-4 h-4 text-orange-400" />
                    <span>แผงควบคุมฝั่งขวา (Right Sidebar)</span>
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    isSidebarOpen ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-400"
                  }`}>
                    {isSidebarOpen ? "เปิดอยู่ (OPEN)" : "พับเก็บ (CLOSED)"}
                  </span>
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="w-full p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 flex items-center justify-between text-xs text-slate-200 transition text-left"
                >
                  <span className="flex items-center gap-2.5">
                    {isFullscreen ? (
                      <Minimize2 className="w-4 h-4 text-sky-400" />
                    ) : (
                      <Maximize2 className="w-4 h-4 text-sky-400" />
                    )}
                    <span>โหมดเต็มหน้าจอ (Fullscreen)</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {isFullscreen ? "ย่อหน้าต่าง" : "เต็มจอ"}
                  </span>
                </button>
              </div>
            </div>

            {/* Column 2: System & Network Status */}
            <div className="space-y-3">
              <div className="text-[11px] font-mono tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400" /> สถานะเครือข่าย & หุ่นยนต์
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">ROS Bridge Target:</span>
                  <span className="text-slate-200 font-semibold">:9090</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Bun Gateway:</span>
                  <span className="text-slate-200 font-semibold">:3000</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
                  <span className="text-slate-400">Connection Health:</span>
                  <span className={isConnected ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                    {isConnected ? "ONLINE (HEALTHY)" : "DISCONNECTED"}
                  </span>
                </div>
              </div>
            </div>

            {/* Column 3: Project Information */}
            <div className="space-y-3">
              <div className="text-[11px] font-mono tracking-wider text-slate-400 uppercase">
                เกี่ยวกับโครงการ
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
                <div className="font-bold text-white">JOB260803 MEKTEC – Relayout AMR</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  ระบบควบคุมและตรวจวัดสถานะ Real-time หุ่นยนต์ขนส่ง AMV-01 พร้อมระบบ Safety Interlock เชื่อมต่อตรงกับ rosbridge_server
                </p>
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>MINIRW Co.,Ltd.</span>
                  <span>VERSION 1.0.0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
