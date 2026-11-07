import { useRef, useEffect, useState, useCallback } from "react";
import {
  AlertTriangle,
  Compass,
  Crosshair,
  Maximize2,
  Minimize2,
  ShieldAlert,
  Sun,
  ZoomIn,
  ZoomOut,
  Layers,
  MapPin,
  Eye,
  Radio,
} from "lucide-react";
import type {
  NavigationStatus,
  BaseStatus,
  RobotPose,
  StationData,
} from "../../types/telemetry";
import { MAP_CONFIG } from "../../config";

interface DynamicMapData {
  image_base64?: string;
  resolution?: number;
  origin?: number[];
  width?: number;
  height?: number;
}

interface StationCanvasProps {
  theme?: "light" | "dark";
  nav: NavigationStatus | null;
  base: BaseStatus | null;
  pose?: RobotPose | null;
  stations: StationData[];
  selectedStation: StationData | null;
  onSelectStation: (station: StationData) => void;
  viewMode?: string;
  onSelectViewMode?: (mode: string) => void;
  lastUpdated?: string;
}

export function StationCanvas({
  theme = "dark",
  nav,
  base,
  pose,
  stations,
  selectedStation,
  onSelectStation,
  viewMode = "overview",
  onSelectViewMode,
  lastUpdated,
}: StationCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mapImageRef = useRef<HTMLImageElement | null>(null);

  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [mapMeta, setMapMeta] = useState({
    originX: MAP_CONFIG.ORIGIN_X,
    originY: MAP_CONFIG.ORIGIN_Y,
    resolution: MAP_CONFIG.RESOLUTION,
    width: MAP_CONFIG.IMAGE_WIDTH,
    height: MAP_CONFIG.IMAGE_HEIGHT,
    realWidth: MAP_CONFIG.REAL_WIDTH_METERS,
    realHeight: MAP_CONFIG.REAL_HEIGHT_METERS,
  });

  // Pan & Zoom State (Centered on Mektec Factory Plant: X=27.6m, Y=5.2m)
  const [zoom, setZoom] = useState<number>(0.38);
  const [pan, setPan] = useState<{ x: number; y: number }>({
    x: -210,
    y: 35,
  });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({
    width: 1200,
    height: 700,
  });

  const isObstacle = nav?.obstacle === "Detecting";
  const isEmergency = base?.emergency_button ?? false;
  const currentStation = nav?.current_station || "Material Room";

  // 1. ดึงภาพแผนที่โรงงานจาก ROS Service /get_map_image ผ่าน Bun API
  useEffect(() => {
    let isMounted = true;

    const fetchMap = async () => {
      try {
        console.log("[INFO] [Canvas] Fetching dynamic map from /api/map/dynamic...");
        const res = await fetch("/api/map/dynamic");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: DynamicMapData = await res.json();

        if (isMounted && data.image_base64) {
          const img = new Image();
          img.src = data.image_base64;
          img.onload = () => {
            if (!isMounted) return;
            mapImageRef.current = img;
            setMapLoaded(true);
            if (data.origin && data.resolution && data.width && data.height) {
              setMapMeta({
                originX: data.origin[0],
                originY: data.origin[1],
                resolution: data.resolution,
                width: data.width,
                height: data.height,
                realWidth: Number((data.width * data.resolution).toFixed(1)),
                realHeight: Number((data.height * data.resolution).toFixed(1)),
              });
            }
            console.log("[INFO] [Canvas] Dynamic ROS Base64 map loaded successfully");
          };
          return;
        }
      } catch (err) {
        console.warn("[WARN] [Canvas] Dynamic map unavailable, falling back to static map:", err);
      }

      // Static Asset Fallback
      const staticImg = new Image();
      staticImg.src = MAP_CONFIG.IMAGE_URL;
      staticImg.onload = () => {
        if (!isMounted) return;
        mapImageRef.current = staticImg;
        setMapLoaded(true);
        console.log("[INFO] [Canvas] Static map loaded successfully");
      };
      staticImg.onerror = () => {
        if (!isMounted) return;
        setMapLoaded(false);
        console.warn("[WARN] [Canvas] Static map not found. Using high-precision vector grid.");
      };
    };

    fetchMap();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. ปรับขนาด Canvas ให้เต็มหน้าจอแบบ Edge-to-Edge อัตโนมัติ (ResizeObserver)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setCanvasSize({ width: Math.floor(width), height: Math.floor(height) });
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // 3. แปลงพิกัด ROS (เมตร) เป็น Canvas (พิกเซล)
  const rosToCanvas = useCallback(
    (xRos: number, yRos: number, w: number, h: number) => {
      const centerX = w / 2;
      const centerY = h / 2;
      const scale = (1 / mapMeta.resolution) * zoom; // 20 * zoom

      // ROS: แกน Y ชี้ขึ้น (North), Canvas: แกน Y ชี้ลง
      const canvasX = centerX + xRos * scale + pan.x;
      const canvasY = centerY - yRos * scale + pan.y;

      return { x: canvasX, y: canvasY };
    },
    [zoom, pan, mapMeta.resolution],
  );

  // 4. โหมดติดตามรถ AGV (Follow Mode)
  useEffect(() => {
    if (viewMode === "follow" && pose) {
      const scale = (1 / mapMeta.resolution) * zoom;
      setPan({
        x: -pose.x * scale,
        y: pose.y * scale,
      });
    } else if (viewMode === "overview") {
      setZoom(0.38);
      setPan({ x: -210, y: 35 });
    } else if (viewMode === "closeup") {
      setZoom(0.8);
      if (pose) {
        const scale = (1 / mapMeta.resolution) * 0.8;
        setPan({
          x: -pose.x * scale,
          y: pose.y * scale,
        });
      }
    }
  }, [viewMode, pose?.x, pose?.y, mapMeta.resolution]);

  // 5. Render Loop (Decoupled Canvas Painting 60fps)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const width = canvasSize.width;
      const height = canvasSize.height;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const isDark = theme === "dark";

      // 5.1 Clear Background (Industrial Blueprint Slate / Soft CAD Gray)
      ctx.fillStyle = isDark ? "#161b22" : "#eef2f6";
      ctx.fillRect(0, 0, width, height);

      // 5.2 Subtle CAD Grid Lines (1-meter & 5-meter)
      ctx.save();
      const meterPixel = (1 / mapMeta.resolution) * zoom;
      const step = meterPixel * 5; // เส้นกริดทุก 5 เมตร
      const startX = ((width / 2 + pan.x) % step + step) % step;
      const startY = ((height / 2 + pan.y) % step + step) % step;

      ctx.strokeStyle = isDark ? "rgba(48, 54, 61, 0.4)" : "rgba(203, 213, 225, 0.7)";
      ctx.lineWidth = 1;
      for (let x = startX; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = startY; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();

      // 5.3 RViz Coordinate Axes: เส้นสีแดง (แกน X) และเส้นสีเขียว (แกน Y)
      const origin = rosToCanvas(0, 0, width, height);
      ctx.save();

      // แกน X (สีแดง - ชี้ไปทางขวาตามแนว Y=0 ของ ROS)
      ctx.strokeStyle = "rgba(239, 68, 68, 0.75)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, origin.y);
      ctx.lineTo(width, origin.y);
      ctx.stroke();

      // แกน Y (สีเขียว - ชี้ขึ้นบนตามแนว X=0 ของ ROS)
      ctx.strokeStyle = "rgba(34, 197, 94, 0.75)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(origin.x, 0);
      ctx.lineTo(origin.x, height);
      ctx.stroke();

      // ป้ายกำกับแกน X และ Y แบบ RViz
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 11px monospace";
      ctx.fillText("+X", width - 24, origin.y - 6);
      ctx.fillStyle = "#22c55e";
      ctx.fillText("+Y", origin.x + 6, 20);

      // สัญลักษณ์ Origin (0,0)
      ctx.fillStyle = "#f97316";
      ctx.font = "bold 10px monospace";
      ctx.fillText("(0,0)", origin.x + 6, origin.y + 14);
      ctx.restore();

      // 5.4 Layer แผนที่ Occupancy Grid โรงงาน Mektec
      const mapTopLeft = rosToCanvas(
        mapMeta.originX,
        mapMeta.originY + mapMeta.realHeight,
        width,
        height,
      );
      const renderW = mapMeta.width * zoom;
      const renderH = mapMeta.height * zoom;

      if (mapLoaded && mapImageRef.current) {
        ctx.save();
        ctx.drawImage(mapImageRef.current, mapTopLeft.x, mapTopLeft.y, renderW, renderH);

        // กรอบขอบเขตโรงงาน Mektec
        ctx.strokeStyle = "rgba(249, 115, 22, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(mapTopLeft.x, mapTopLeft.y, renderW, renderH);
        ctx.restore();
      } else {
        // Fallback Blueprint Grid
        ctx.save();
        ctx.fillStyle = "rgba(22, 27, 34, 0.85)";
        ctx.fillRect(mapTopLeft.x, mapTopLeft.y, renderW, renderH);
        ctx.strokeStyle = "rgba(56, 189, 248, 0.3)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.strokeRect(mapTopLeft.x, mapTopLeft.y, renderW, renderH);

        ctx.fillStyle = "rgba(148, 163, 184, 0.5)";
        ctx.font = "bold 13px monospace";
        ctx.textAlign = "center";
        ctx.fillText(
          `MEKTEC PLANT AREA (${mapMeta.realWidth}m x ${mapMeta.realHeight}m)`,
          mapTopLeft.x + renderW / 2,
          mapTopLeft.y + renderH / 2 - 10,
        );
        ctx.font = "10px monospace";
        ctx.fillText(
          `Origin: (${mapMeta.originX}, ${mapMeta.originY}) | Res: ${mapMeta.resolution}m/px`,
          mapTopLeft.x + renderW / 2,
          mapTopLeft.y + renderH / 2 + 10,
        );
        ctx.restore();
      }
      
      // 5.5 Layer เส้นทางเดินรถจำลอง (Virtual Tracks ระหว่างสถานี)
      if (stations.length > 1) {
        ctx.save();
        ctx.strokeStyle = "rgba(249, 115, 22, 0.35)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        stations.forEach((st, idx) => {
          const pt = rosToCanvas(st.x, st.y, width, height);
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.restore();
      }

      // 5.6 Layer หมุดสถานี (Station Markers)
      stations.forEach((st) => {
        const pt = rosToCanvas(st.x, st.y, width, height);
        const isSelected = selectedStation?.name === st.name;
        const isDocked = currentStation === st.name;

        ctx.save();

        // หมุดจุดสถานีสีส้มตาม Reference
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isSelected ? 8 : 5, 0, Math.PI * 2);
        ctx.fillStyle = isDocked || isSelected ? "#f97316" : "#fb923c";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.stroke();

        // ลูกศรทิศทางหันหน้าของสถานี
        const rad = (st.theta * Math.PI) / 180;
        const arrowLen = 14;
        const arrowEndX = pt.x + Math.cos(rad) * arrowLen;
        const arrowEndY = pt.y - Math.sin(rad) * arrowLen;

        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(arrowEndX, arrowEndY);
        ctx.strokeStyle = "#f97316";
        ctx.lineWidth = 2;
        ctx.stroke();

        // ป้ายชื่อสถานี
        ctx.font = isSelected ? "bold 11px sans-serif" : "9px sans-serif";
        ctx.fillStyle = isSelected ? "#f97316" : "#cbd5e1";
        ctx.textAlign = "center";
        ctx.fillText(st.name, pt.x, pt.y + 16);

        ctx.restore();
      });

      // 5.7 Layer ตัวรถ AGV (AMV-01 Pose)
      const robotX = pose?.x ?? 67.92;
      const robotY = pose?.y ?? 23.4;
      const robotYaw = pose?.theta ?? 90;
      const robotPos = rosToCanvas(robotX, robotY, width, height);

      ctx.save();
      ctx.translate(robotPos.x, robotPos.y);
      ctx.rotate((-robotYaw * Math.PI) / 180);

      // กรอบความปลอดภัยรอบตัวรถ
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.fillStyle = isEmergency
        ? "rgba(225, 29, 72, 0.4)"
        : isObstacle
        ? "rgba(245, 158, 11, 0.4)"
        : isDark
        ? "rgba(249, 115, 22, 0.25)"
        : "rgba(14, 165, 233, 0.2)";
      ctx.fill();

      // ตัวถังรถ AMR (สไตล์ SYNAOS Blue ในโหมดสว่าง)
      ctx.fillStyle = isDark ? "#1e293b" : "#0f1b5c";
      ctx.strokeStyle = isEmergency
        ? "#f43f5e"
        : isObstacle
        ? "#f59e0b"
        : isDark
        ? "#f97316"
        : "#0284c7";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-15, -11, 30, 22, 4);
      ctx.fill();
      ctx.stroke();

      // สัญลักษณ์หัวรถ
      ctx.fillStyle = isDark ? "#f97316" : "#38bdf8";
      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.lineTo(6, -5);
      ctx.lineTo(6, 5);
      ctx.fill();

      ctx.restore();

      // ป้ายกำกับตัวรถ (Badge Pill ลอยเหนือตัวรถ สไตล์ SYNAOS)
      ctx.save();
      const badgeW = 54;
      const badgeH = 18;
      const badgeX = robotPos.x - badgeW / 2;
      const badgeY = robotPos.y - 34;

      ctx.fillStyle = isDark ? "rgba(15, 23, 42, 0.85)" : "#0f1b5c";
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
      ctx.fill();

      ctx.font = "bold 9px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("AGV-001", robotPos.x, badgeY + badgeH / 2);

      ctx.restore();
    };

    render();
    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    zoom,
    pan,
    canvasSize,
    pose,
    stations,
    selectedStation,
    currentStation,
    isObstacle,
    isEmergency,
    mapLoaded,
    mapMeta,
    rosToCanvas,
    theme,
  ]);

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom((prev) => Math.min(Math.max(prev * factor, 0.1), 3.0));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex-1 overflow-hidden select-none bg-slate-100 dark:bg-[#161b22] transition-colors"
    >
      {/* 1. Main Canvas (Edge-to-Edge) */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

      {/* 2. Top-Left Floating HUD */}
      <div className="absolute top-6 left-6 pointer-events-none z-20">
        <div className="flex items-center gap-1.5 text-[11px] font-mono tracking-wider text-sky-600 dark:text-orange-400 font-semibold uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 dark:bg-orange-500 animate-pulse" />
          AMR FLEET • DIGITAL SHOWROOM
        </div>
        <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none mt-1">
          Factory
          <br />
          <span className="text-[#0f1b5c] dark:text-orange-500">in motion.</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 tracking-wide">
          Real-time AMR monitoring AGV-AMV01
        </p>
      </div>

      {/* 3. Top-Right Floating Controls */}
      <div className="absolute top-6 right-6 flex items-center gap-2 z-20">
        <button
          onClick={toggleFullscreen}
          title="เต็มจอ (Fullscreen)"
          className="p-2 rounded-lg bg-white/90 dark:bg-[#21262d]/90 hover:bg-slate-100 dark:hover:bg-[#30363d] border border-slate-200 dark:border-[#30363d] text-slate-700 dark:text-slate-200 transition shadow-md cursor-pointer"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* 4. Bottom-Left Floating View Mode Toolbar */}
      <div className="absolute bottom-6 left-6 flex items-center gap-1.5 p-1 rounded-xl bg-white/90 dark:bg-[#21262d]/90 backdrop-blur-md border border-slate-200 dark:border-[#30363d] z-20 shadow-lg">
        <button
          onClick={() => onSelectViewMode?.("overview")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
            viewMode === "overview"
              ? "bg-[#0f1b5c] text-white font-bold shadow-md dark:bg-orange-500"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>ภาพรวม</span>
        </button>
        <button
          onClick={() => onSelectViewMode?.("closeup")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
            viewMode === "closeup"
              ? "bg-[#0f1b5c] text-white font-bold shadow-md dark:bg-orange-500"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>ใกล้ตัวรถ (3D)</span>
        </button>
        <button
          onClick={() => onSelectViewMode?.("follow")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
            viewMode === "follow"
              ? "bg-[#0f1b5c] text-white font-bold shadow-md dark:bg-orange-500"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>ติดตาม</span>
        </button>
      </div>

      {/* 5. Bottom-Right Floating Dimension Info */}
      <div className="absolute bottom-6 right-6 hidden md:flex items-center gap-3 text-[11px] font-mono text-slate-500 dark:text-slate-400 pointer-events-none z-20 bg-white/90 dark:bg-[#21262d]/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#30363d] shadow-sm">
        <span>
          ขนาดโรงงานจริง: <strong>{mapMeta.realWidth}m x {mapMeta.realHeight}m</strong>
        </span>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <span className={mapLoaded ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-amber-500"}>
          {mapLoaded ? "MAP ACTIVE" : "CONNECTING..."}
        </span>
      </div>

      {/* 6. Critical Safety Banners */}
      {(isObstacle || isEmergency) && (
        <div className="absolute top-24 left-6 right-6 max-w-xl z-30 pointer-events-none">
          {isObstacle && (
            <div className="p-3 rounded-xl border border-amber-500/60 bg-amber-950/80 text-amber-200 flex items-center justify-between text-xs backdrop-blur-md shadow-xl animate-pulse">
              <span className="flex items-center gap-2 font-bold">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                SAFETY INTERLOCK: ตรวจพบสิ่งกีดขวางด้านหน้า
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 font-bold">
                STOP
              </span>
            </div>
          )}
          {isEmergency && (
            <div className="mt-2 p-3 rounded-xl border border-rose-500/60 bg-rose-950/80 text-rose-200 flex items-center justify-between text-xs backdrop-blur-md shadow-xl animate-bounce">
              <span className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                EMERGENCY STOP (E-STOP) : สวิตช์ฉุกเฉินถูกกด
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-rose-600 text-white font-bold">
                HALT
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default StationCanvas;