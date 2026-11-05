import { useState } from "react";
import "./index.css";
import { Sliders } from "lucide-react";
import { Header } from "./components/layout/Header";
import { StationCanvas } from "./components/visualizer/StationCanvas";
import { ControlCenter } from "./components/control/ControlCenter";
import { useTelemetry } from "./hooks/useTelemetry";
import { useStudioProcess } from "./hooks/useStudioProcess";
import { useStationManager } from "./hooks/useStationManager";

export function App() {
  const { telemetry, isConnected, nav, base, pose } = useTelemetry();
  const [viewMode, setViewMode] = useState<string>("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Subprocess Controller (Offline Studio)
  const {
    isRunning: isStudioRunning,
    pid: studioPid,
    isLoading: isStudioLoading,
    toggleStudio,
  } = useStudioProcess();

  // Station Manager
  const {
    stations,
    selectedStation,
    setSelectedStation,
    sendGoStation,
    sendResetPosition,
    actionStatus,
  } = useStationManager();

  return (
    <div className="h-screen w-screen bg-[#161b22] text-slate-200 flex flex-col font-sans select-none overflow-hidden">
      {/* 1. Top Header Navigation */}
      <Header
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isConnected={isConnected}
      />

      {/* 2. Main Workspace (Edge-to-Edge Canvas + Sidebar) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left / Center: Fullscreen RViz Replacement Canvas */}
        <main className="flex-1 relative w-full h-full overflow-hidden">
          <StationCanvas
            nav={nav}
            base={base}
            pose={pose}
            stations={stations}
            selectedStation={selectedStation}
            onSelectStation={setSelectedStation}
            viewMode={viewMode}
            onSelectViewMode={setViewMode}
            lastUpdated={telemetry?.lastUpdated}
          />
        </main>

        {/* Right Sidebar: AGV Explorer & Control Center */}
        {isSidebarOpen && (
          <ControlCenter
            isConnected={isConnected}
            nav={nav}
            base={base}
            onClose={() => setIsSidebarOpen(false)}
            isStudioRunning={isStudioRunning}
            studioPid={studioPid}
            isStudioLoading={isStudioLoading}
            onToggleStudio={toggleStudio}
            stations={stations}
            selectedStation={selectedStation}
            onSelectStation={setSelectedStation}
            onGoStation={sendGoStation}
            onResetPosition={sendResetPosition}
            actionStatus={actionStatus}
            viewMode={viewMode}
            onSelectViewMode={setViewMode}
          />
        )}

        {/* Quick Open Pill Button (if sidebar collapsed) */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="fixed right-6 bottom-6 z-30 bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-xl shadow-xl shadow-orange-500/30 flex items-center gap-2 text-xs font-bold transition active:scale-95 border border-orange-400/40 cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
            <span>เปิดแผงควบคุม AGV</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default App;