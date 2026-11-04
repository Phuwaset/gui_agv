import { useState } from "react";
import "./index.css";
import { Header } from "./components/layout/Header";
import { StationCanvas } from "./components/visualizer/StationCanvas";
import { ViewToolbar } from "./components/visualizer/ViewToolbar";
import { ControlCenter } from "./components/control/ControlCenter";
import { useTelemetry } from "./hooks/useTelemetry";

export function App() {
  const { telemetry, isConnected, nav, base } = useTelemetry();
  const [viewMode, setViewMode] = useState<string>("overview");

  return (
    <div className="min-h-screen w-full bg-[#070b13] text-slate-200 flex flex-col font-sans select-none">
      {/* 1. Header Navigation */}
      <Header />

      {/* 2. Main Workspace (Split Layout) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left / Center: 2D Digital Twin & Factory Canvas */}
        <main className="flex-1 relative bg-gradient-to-b from-[#0a0f1d] via-[#070b14] to-[#04070d] p-8 flex flex-col justify-between overflow-hidden">
          {/* Subtle Grid Background Pattern */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          {/* Title Overlay */}
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-orange-400 uppercase">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
              DIGITAL SHOWROOM / 01
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight mt-1">
              Factory{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-400">
                in motion.
              </span>
            </h2>
            <p className="text-sm text-slate-400 mt-2 max-w-md">
              สำรวจ ตรวจสอบ และควบคุม AGV ยอดนิยมแบบ Real-time เชื่อมต่อกับ
              rosbridge :9090
            </p>
          </div>

          {/* Center 2D Station Visualizer */}
          <div className="relative z-10 my-8 flex-1 flex items-center justify-center">
            <StationCanvas
              nav={nav}
              base={base}
              lastUpdated={telemetry?.lastUpdated}
            />
          </div>

          {/* Bottom Toolbar: Camera / View Mode */}
          <ViewToolbar currentMode={viewMode} onSelectMode={setViewMode} />
        </main>

        {/* Right Sidebar: AGV Explorer Control Center */}
        <ControlCenter isConnected={isConnected} nav={nav} base={base} />
      </div>
    </div>
  );
}

export default App;
