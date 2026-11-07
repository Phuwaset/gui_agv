import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { NavigationStatus, BaseStatus, RobotPose } from "../../types/telemetry";
import {
  Box,
  Compass,
  Crosshair,
  Maximize2,
  RotateCcw,
} from "lucide-react";

interface AGV3DViewerProps {
  theme?: "light" | "dark";
  pose?: RobotPose | null;
  base?: BaseStatus | null;
  nav?: NavigationStatus | null;
  viewMode: string;
  onSelectViewMode: (mode: string) => void;
}

export function AGV3DViewer({
  theme = "dark",
  pose,
  base,
  nav,
  viewMode,
  onSelectViewMode,
}: AGV3DViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modelInfo, setModelInfo] = useState<{
    width: number;
    length: number;
    height: number;
  } | null>(null);

  const modelRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let animationFrameId: number;
    const width = mount.clientWidth || 800;
    const height = mount.clientHeight || 600;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color("#161b22");

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(3.5, 2.8, 4.5);

    // 3. WebGL Renderer (ปิดเงา ShadowMap ตามคำแนะนำเพื่อความลื่นไหล 60 FPS)
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false; // ปิดเงาประหยัด GPU
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mount.appendChild(renderer.domElement);

    // 4. Orbit Controls (หมุน-ซูม-แพน กล้อง 3 มิติอย่างอิสระ)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // ไม่ให้มุมกล้องมุดลงใต้พื้น
    controls.minDistance = 1.0;
    controls.maxDistance = 15.0;
    controls.target.set(0, 0.4, 0);
    controlsRef.current = controls;

    // 5. Lighting (แสงรอบทิศทาง + แสงสีส้ม Industrial Rim Light)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight1.position.set(5, 10, 7);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x0ea5e9, 0.8);
    dirLight2.position.set(-6, 4, -5);
    scene.add(dirLight2);

    // Safety Orange Accent Light ใต้ท้องรถ
    const orangeRimLight = new THREE.PointLight(0xf97316, 2.5, 6);
    orangeRimLight.position.set(0, 0.2, 0);
    scene.add(orangeRimLight);

    // 6. Industrial Floor Grid
    const gridHelper = new THREE.GridHelper(
      20,
      40,
      0xf97316,
      0x30363d
    );
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // 7. โหลดโมเดล 3D AGV จาก /module/agv.glb
    setIsLoading(true);
    setLoadError(null);

    const loader = new GLTFLoader();
    loader.load(
      "/module/agv.glb",
      (gltf) => {
        const model = gltf.scene;

        // คำนวณ Bounding Box เพื่อจัดวางตำแหน่งกึ่งกลางพื้นดินพอดี
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // ขยับ Pivot ให้อยู่กึ่งกลางฐานล้อ
        model.position.x = -center.x;
        model.position.y = -box.min.y; // วางแนบพื้นดิน Y=0
        model.position.z = -center.z;

        const group = new THREE.Group();
        group.add(model);
        scene.add(group);
        modelRef.current = group;

        setModelInfo({
          width: Number(size.x.toFixed(2)),
          height: Number(size.y.toFixed(2)),
          length: Number(size.z.toFixed(2)),
        });

        setIsLoading(false);
        console.log(
          `[INFO] [3D] agv.glb loaded: ${size.x.toFixed(2)}m x ${size.y.toFixed(2)}m x ${size.z.toFixed(2)}m`,
        );
      },
      undefined,
      (error) => {
        console.error("[ERROR] [3D] Failed to load agv.glb:", error);
        setIsLoading(false);
        setLoadError("ไม่สามารถโหลดโมเดล 3D ได้ (ตรวจสอบเส้นทาง /module/agv.glb)");
      },
    );

    // 8. Resize Observer เพื่อปรับ Resolution อัตโนมัติ
    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mount);

    // 9. Render Loop (60 FPS Animation Frame with LERP)
    const animate = () => {
      controls.update();

      // ปรับองศา Yaw ของตัวรถ 3D ตามข้อมูล ROS แบบ Smooth LERP
      if (modelRef.current && pose) {
        // ใน ROS: theta หน่วยองศา (ทวนเข็ม)
        const targetRad = (-pose.theta * Math.PI) / 180;
        modelRef.current.rotation.y = THREE.MathUtils.lerp(
          modelRef.current.rotation.y,
          targetRad,
          0.08,
        );
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup เมื่อออกจาก Component
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex-1 overflow-hidden select-none bg-[#161b22]"
    >
      {/* 1. WebGL Three.js Mount Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* 2. Top-Left Floating HUD */}
      <div className="absolute top-6 left-6 pointer-events-none z-20">
        <div className="flex items-center gap-1.5 text-[11px] font-mono tracking-wider text-orange-400 font-semibold uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
          DIGITAL SHOWROOM 2.01 • 3D DIGITAL TWIN
        </div>
        <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-none mt-1">
          AMV-01
          <br />
          <span className="text-orange-500">Close-up View</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1.5 tracking-wide flex items-center gap-2">
          <span>คลิกซ้ายลากเพื่อหมุน 360° | เลื่อน Scroll เพื่อซูม</span>
        </p>
      </div>

      {/* 3. Top-Right Floating Controls (DAY SCENE, Reset Camera & Fullscreen) */}
      <div className="absolute top-6 right-6 flex items-center gap-2 z-20">
        <button
          onClick={handleResetCamera}
          title="รีเซ็ตมุมกล้อง 3D"
          className="p-2 rounded-lg bg-[#21262d]/90 hover:bg-[#30363d] border border-[#30363d] text-slate-200 transition shadow-lg cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={toggleFullscreen}
          title="เต็มจอ (Fullscreen)"
          className="p-2 rounded-lg bg-[#21262d]/90 hover:bg-[#30363d] border border-[#30363d] text-slate-200 transition shadow-lg cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 4. Bottom-Left Floating View Mode Toolbar */}
      <div className="absolute bottom-6 left-6 flex items-center gap-1.5 p-1 rounded-xl bg-[#21262d]/90 backdrop-blur-md border border-[#30363d] z-20 shadow-xl">
        <button
          onClick={() => onSelectViewMode("overview")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
            viewMode === "overview"
              ? "bg-orange-500 text-white font-bold shadow-md shadow-orange-500/30"
              : "text-slate-300 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>ภาพรวม</span>
        </button>

        <button
          onClick={() => onSelectViewMode("closeup")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
            viewMode === "closeup"
              ? "bg-orange-500 text-white font-bold shadow-md shadow-orange-500/30"
              : "text-slate-300 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Box className="w-3.5 h-3.5 text-orange-300" />
          <span>ใกล้ตัวรถ (3D)</span>
        </button>

        <button
          onClick={() => onSelectViewMode("follow")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
            viewMode === "follow"
              ? "bg-orange-500 text-white font-bold shadow-md shadow-orange-500/30"
              : "text-slate-300 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>ติดตาม</span>
        </button>
      </div>

      {/* 5. Bottom-Right Floating Model Specification Badge */}
      <div className="absolute bottom-6 right-6 hidden md:flex items-center gap-3 text-[11px] font-mono text-slate-400 pointer-events-none z-20 bg-[#21262d]/80 px-3 py-1.5 rounded-lg border border-[#30363d]">
        <span className="flex items-center gap-1.5">
          <Box className="w-3.5 h-3.5 text-orange-400" />
          โมเดล: <strong>agv.glb</strong>
        </span>
        {modelInfo && (
          <>
            <span className="text-slate-600">|</span>
            <span>
              สเกล: {modelInfo.width}m x {modelInfo.length}m (สูง {modelInfo.height}m)
            </span>
          </>
        )}
        <span className="text-slate-600">|</span>
        <span className="text-emerald-400 font-bold">THREE.JS 60 FPS</span>
      </div>

      {/* Loading Spinner / Error Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-[#161b22]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30">
          <div className="w-10 h-10 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
          <div className="text-xs font-mono text-slate-300 animate-pulse">
            กำลังโหลดโมเดล 3D AGV (agv.glb)...
          </div>
        </div>
      )}

      {loadError && (
        <div className="absolute inset-0 bg-[#161b22]/90 flex flex-col items-center justify-center gap-3 z-30 p-6 text-center">
          <div className="p-3 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <Box className="w-8 h-8" />
          </div>
          <div className="text-sm font-bold text-white">{loadError}</div>
          <button
            onClick={() => onSelectViewMode("overview")}
            className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition"
          >
            กลับสู่แผนที่ภาพรวม (2D)
          </button>
        </div>
      )}
    </div>
  );
}

export default AGV3DViewer;
