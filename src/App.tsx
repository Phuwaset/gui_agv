import { useState } from "react";
import "./index.css";
import { NavRail } from "./components/layout/NavRail";
import { StationCanvas } from "./components/visualizer/StationCanvas";
import { AGV3DViewer } from "./components/visualizer/AGV3DViewer";
import { InspectorPanel } from "./components/control/InspectorPanel";
import { useTheme } from "./hooks/useTheme";
import { useTelemetry } from "./hooks/useTelemetry";
import { useStudioProcess } from "./hooks/useStudioProcess";
import { useStationManager } from "./hooks/useStationManager";

export function App() {
  const { theme, toggleTheme } = useTheme();
  const { telemetry, isConnected, nav, base, pose } = useTelemetry();
  const [viewMode, setViewMode] = useState<string>("overview");
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(true);

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
    <div className="h-screen w-screen bg-slate-100 dark:bg-[#0b0f19] text-slate-800 dark:text-slate-100 flex flex-row font-sans select-none overflow-hidden transition-colors">
      {/* 1. Left Navigation Rail (SYNAOS / Enterprise Style) */}
      <NavRail
        theme={theme}
        onToggleTheme={toggleTheme}
        viewMode={viewMode}
        onSelectViewMode={setViewMode}
        isInspectorOpen={isInspectorOpen}
        onToggleInspector={() => setIsInspectorOpen((prev) => !prev)}
        isConnected={isConnected}
        isStudioRunning={isStudioRunning}
        isStudioLoading={isStudioLoading}
        onToggleStudio={toggleStudio}
      />

      {/* 2. Main Center Viewport (2D Canvas Floorplan or 3D Digital Twin) */}
      <main className="flex-1 relative w-full h-full overflow-hidden">
        {viewMode === "closeup" ? (
          <AGV3DViewer
            theme={theme}
            pose={pose}
            base={base}
            nav={nav}
            viewMode={viewMode}
            onSelectViewMode={setViewMode}
          />
        ) : (
          <StationCanvas
            theme={theme}
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
        )}
      </main>

      {/* 3. Right Flyout / Inspector Panel (AGV-001 Details & Order Tabs) */}
      {isInspectorOpen && (
        <InspectorPanel
          isConnected={isConnected}
          nav={nav}
          base={base}
          pose={pose}
          lastUpdated={telemetry?.lastUpdated}
          stations={stations}
          selectedStation={selectedStation}
          onSelectStation={setSelectedStation}
          onGoStation={sendGoStation}
          onResetPosition={sendResetPosition}
          actionStatus={actionStatus}
          onClose={() => setIsInspectorOpen(false)} 
        />
      )}
    </div>
  );
}

export default App;
