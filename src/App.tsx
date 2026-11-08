import { useState } from "react";
import "./index.css";
import { NavRail } from "./components/layout/NavRail";
import { StationCanvas } from "./components/visualizer/StationCanvas";
import { AGV3DViewer } from "./components/visualizer/AGV3DViewer";
import { InspectorPanel } from "./components/control/InspectorPanel";
import { MapRouteManagerPane } from "./components/control/MapRouteManagerPane";
import { DanglingEdgeModal } from "./components/control/DanglingEdgeModal";
import { useTheme } from "./hooks/useTheme";
import { useTelemetry } from "./hooks/useTelemetry";
import { useStudioProcess } from "./hooks/useStudioProcess";
import { useStationManager } from "./hooks/useStationManager";
import { useMapLayout } from "./hooks/useMapLayout";

export function App() {
  const { theme, toggleTheme } = useTheme();
  const {
    telemetry,
    isConnected,
    nav,
    base,
    pose,
    plannedPath,
    stationMarkers,
    waypointMarkers,
  } = useTelemetry();
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
    stationQueue,
    addToQueue,
    removeFromQueue,
    clearQueue,
    sendGoStationQueue,
    sendStation,
    setSendStation,
    receiveStation,
    setReceiveStation,
    sendGoStationList,
    sendNextStation,
    sendCancelQueue,
    sendCancelNavigation,
    actionStatus,
  } = useStationManager();

  // Hardware-Synced Movement State for Interlock
  const isRobotMoving =
    nav?.navigation_status === "Got path planning" || base?.robot_moving === true;

  // Map & Route Manager Hook
  const mapLayout = useMapLayout(isRobotMoving);

  // รวมรายการสถานี (ถ้าใน MapLayout มีข้อมูล ให้ใช้ร่วมกัน)
  const activeStations =
    mapLayout.layout.stations.length > 0 ? mapLayout.layout.stations : stations;

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

      {/* 2. Main Viewport (Overview / 3D Close-up / Route Manager Split-View) */}
      <main className="flex-1 relative w-full h-full overflow-hidden flex flex-row">
        {/* โหมด Route & Map Manager (40/60 Split-View Dashboard) */}
        {viewMode === "manager" && (
          <MapRouteManagerPane
            layout={mapLayout.layout}
            activeTab={mapLayout.activeTab}
            onSelectTab={mapLayout.setActiveTab}
            searchQuery={mapLayout.searchQuery}
            onSearchChange={mapLayout.setSearchQuery}
            selectedNodeName={mapLayout.selectedNodeName}
            onSelectNode={mapLayout.setSelectedNodeName}
            onUpdateStation={mapLayout.updateStation}
            onAddStation={mapLayout.addStation}
            onUpdateWaypoint={mapLayout.updateWaypoint}
            onAddWaypoint={mapLayout.addWaypoint}
            onUpdateTrack={mapLayout.updateTrack}
            onAddTrack={mapLayout.addTrack}
            onDeleteNode={(name) => mapLayout.deleteNode(name, false)}
            onSaveAll={mapLayout.saveAll}
            onRefresh={mapLayout.fetchLayout}
            isSaving={mapLayout.isSaving}
            isMoving={isRobotMoving}
            notification={mapLayout.notification}
          />
        )}

        {/* Viewport Center Canvas / 3D Viewer */}
        <div className="flex-1 relative w-full h-full overflow-hidden">
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
              stations={activeStations}
              selectedStation={selectedStation}
              onSelectStation={(st) => {
                setSelectedStation(st);
                mapLayout.setSelectedNodeName(st.name);
              }}
              viewMode={viewMode}
              onSelectViewMode={setViewMode}
              lastUpdated={telemetry?.lastUpdated}
              plannedPath={plannedPath}
              stationMarkers={stationMarkers}
              waypointMarkers={waypointMarkers}
              waypoints={mapLayout.layout.waypoints}
              tracks={mapLayout.layout.tracks}
              highlightNodeName={mapLayout.selectedNodeName}
              onSelectNode={mapLayout.setSelectedNodeName}
            />
          )}
        </div>
      </main>

      {/* 3. Right Flyout / Inspector Panel (เฉพาะเมื่อเปิดและไม่ได้อยู่ในโหมด Manager) */}
      {isInspectorOpen && viewMode !== "manager" && (
        <InspectorPanel
          isConnected={isConnected}
          nav={nav}
          base={base}
          pose={pose}
          lastUpdated={telemetry?.lastUpdated}
          stations={activeStations}
          selectedStation={selectedStation}
          onSelectStation={setSelectedStation}
          onGoStation={sendGoStation}
          onResetPosition={sendResetPosition}
          stationQueue={stationQueue}
          onAddToQueue={addToQueue}
          onRemoveFromQueue={removeFromQueue}
          onClearQueue={clearQueue}
          onGoStationQueue={sendGoStationQueue}
          sendStation={sendStation}
          onSelectSendStation={setSendStation}
          receiveStation={receiveStation}
          onSelectReceiveStation={setReceiveStation}
          onGoStationList={sendGoStationList}
          onNextStation={sendNextStation}
          onCancelQueue={sendCancelQueue}
          onCancelNavigation={sendCancelNavigation}
          actionStatus={actionStatus}
          onClose={() => setIsInspectorOpen(false)}
        />
      )}

      {/* 4. Dangling Edge Protection Modal */}
      {mapLayout.danglingWarning && (
        <DanglingEdgeModal
          nodeName={mapLayout.danglingWarning.nodeName}
          connectedEdges={mapLayout.danglingWarning.connectedEdges}
          onCancel={() => mapLayout.setDanglingWarning(null)}
          onConfirm={() =>
            mapLayout.deleteNode(mapLayout.danglingWarning!.nodeName, true)
          }
        />
      )}
    </div>
  );
}

export default App;
