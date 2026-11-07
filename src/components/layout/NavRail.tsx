import {
  Box,
  Crosshair,
  Map as MapIcon,
  Maximize2,
  Moon,
  PanelRight,
  Power,
  Sun,
} from "lucide-react";
import type { Theme } from "../../hooks/useTheme";
import { useState } from "react";

interface NavRailProps {
  theme: Theme;
  onToggleTheme: () => void;
  viewMode: string;
  onSelectViewMode: (mode: string) => void;
  isInspectorOpen: boolean;
  onToggleInspector: () => void;
  isConnected: boolean;
  isStudioRunning: boolean;
  isStudioLoading: boolean;
  onToggleStudio: () => void;
}

function RailButton({
  active,
  title,
  onClick,
  disabled,
  isExpanded = false,
  children,
}: {
  // Type Annotation role of Tytescript
  active?: boolean;
  title: string;
  onClick: () => void; // function no return value
  disabled?: boolean;
  isExpanded?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`relative h-10 rounded-lg flex items-center transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
        isExpanded ? "w-full px-3 justify-start gap-3" : "w-10 justify-center"
      } ${
        active
          ? "bg-white/15 text-white font-semibold shadow-inner" 
          : "text-slate-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      {active && (
        <span className="absolute -left-3 top-2 bottom-2 w-1 rounded-r bg-sky-400" />
      )}
      <div className="shrink-0 flex items-center justify-center">
        {children}
      </div>
      {isExpanded && (
        <span className="text-xs font-medium text-white truncate transition-opacity duration-200 whitespace-nowrap">
          {title}
        </span>
      )}
    </button>
  );
}

export function NavRail({
  theme,
  onToggleTheme,
  viewMode,
  onSelectViewMode,
  isInspectorOpen,
  onToggleInspector,
  isConnected,
  isStudioRunning,
  isStudioLoading,
  onToggleStudio,
}: NavRailProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <nav
      className={`shrink-0 h-full flex flex-col justify-between py-4 bg-[#0f1b5c] dark:bg-[#0a0f2e] text-white border-r border-[#1a2b7a]/40 dark:border-white/5 transition-all duration-300 ease-in-out px-3 select-none ${
        isExpanded ? "w-56" : "w-16 items-center"
      }`}
    >
      <div
        className={`flex flex-col gap-2 ${isExpanded ? "w-full items-stretch" : "items-center"}`}
      >
        {/* Logo + toggle expand/collapse button */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? "พับเก็บเมนู (Collapse)" : "กางเมนูออก (Expand)"}
          className={`flex items-center gap-3 mb-4 p-2 rounded-lg hover:bg-white/10 transition cursor-pointer text-white ${
            isExpanded ? "w-full justify-start" : "w-10 h-10 justify-center"
          }`}
        >
          <div className="relative font-black text-lg tracking-tighter shrink-0 select-none">
            AMV
            <span
              className={`absolute top-0 right-0 w-2 h-2 rounded-full ring-2 ring-[#0f1b5c] dark:ring-[#0a0f2e] ${
                isConnected ? "bg-emerald-400" : "bg-rose-500"
              }`}
            />
          </div>
          {isExpanded && (
            <div className="text-left overflow-hidden flex-1">
              <div className="text-xs font-bold leading-tight">MINIRW</div>
              <div className="text-[10px] text-indigo-300 font-mono">
                STUDIO V1.0
              </div>
            </div>
          )}
        </button>

        <RailButton
          title="Map 2D"
          active={viewMode === "overview"}
          onClick={() => onSelectViewMode("overview")}
          isExpanded={isExpanded}
        >
          <MapIcon className="w-5 h-5" />
        </RailButton>

        {/* <!--ลำดับของการจัดการปุ่ม --> */}
        <RailButton
          title={isInspectorOpen ? "Hide AGV panel" : "Show AGV panel"}
          active={isInspectorOpen}
          onClick={onToggleInspector}
          isExpanded={isExpanded}
        >
          <PanelRight className="w-5 h-5" />
        </RailButton>

        <RailButton
          title="Follow robot"
          active={viewMode === "follow"}
          onClick={() => onSelectViewMode("follow")}
          isExpanded={isExpanded}
        >
          <Crosshair className="w-5 h-5" />
        </RailButton>

        <RailButton
          title="3D model"
          active={viewMode === "closeup"}
          onClick={() => onSelectViewMode("closeup")}
          isExpanded={isExpanded}
        >
          <Box className="w-5 h-5" />
        </RailButton>
        
      </div>

      <div
        className={`flex flex-col gap-2 ${isExpanded ? "w-full items-stretch" : "items-center"}`}
      >
        <RailButton
          title={
            isStudioLoading
              ? "Studio: working..."
              : isStudioRunning
                ? "Stop Offline Studio (roslaunch)"
                : "Start Offline Studio (roslaunch)"
          }
          onClick={onToggleStudio}
          disabled={isStudioLoading}
          isExpanded={isExpanded}
        >
          <Power
            className={`w-5 h-5 ${isStudioRunning ? "text-emerald-400" : ""} ${
              isStudioLoading ? "animate-pulse" : ""
            }`}
          />
        </RailButton>
        <RailButton
          title={
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
          onClick={onToggleTheme}
          isExpanded={isExpanded}
        >
          {theme === "dark" ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </RailButton>
        <RailButton
          title="Fullscreen"
          onClick={toggleFullscreen}
          isExpanded={isExpanded}
        >
          <Maximize2 className="w-5 h-5" />
        </RailButton>
      </div>
    </nav>
  );
}

export default NavRail;

// Sticky 1 : lern & lesson code react props combind annotation types role.
// * Sticky mean i want to call sticky look like technical progarmming to lern // if i search Sticky i will see my note&lesson that's it.

// private or local function()
// exmaple : function BehaviorStatus({ // Object Destructuring } : {annotation type}){ return }

// Sticky 2 : lern Clean Code & Standard React props interface

// mathod
// interface nameInterface {
//   active1: type (int ตัวเลขจำนวนเต็ม หรือ ทศนิยม ใน TypeScript จะใช้ ตัวแปรว่า number)
//   active2: type (int ตัวเลขจำนวนเต็ม หรือ ทศนิยม ใน TypeScript จะใช้ ตัวแปรว่า number)
// }

// example form P'bun
//     interface NameProps {
//         active1: boolean;  // true / false
//         active2: number;   // ตัวเลข (ใช้ number แทน int/float)
//         active3: string;   // ข้อความ
//      }

// implements
// Crate function with galbol or local function
// //example local function, if you want to gaobol function use export function name.
//   function name ({ //
//     active1,
//     active2,
//     active3,
//   } : nameInterface ) {// call props interface
//       // return something?
//   }
