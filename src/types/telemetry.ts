// 1. Navigation Status /amv_navigation_status
export interface NavigationStatus {
  current_station: string;
  reset_station: string;
  going_station: string;
  send_station: string;
  receive_station: string;
  navigation_status: string;
  pin_lock: string;
  obstacle: string;
}

// 2. Base Status จาก /amv_base_status
export interface BaseStatusHeader {
  seq: number;
  stamp: {
    secs: number;
    nsecs: number;
  };
  frame_id: string; // "base_footprint_amv"
}

export interface BaseStatus {
  linear_velocity: number;
  angular_velocity: number;
  battery_level: number;
  ultrasonic: number;
  system_fault_code: number;
  motor_fault_code: number;
  robot_ready: boolean;
  robot_moving: boolean;
  stop_conf: boolean;
  auto_mode: boolean;
  linear_down_conf: boolean;
  linear_up_conf: boolean;
  green_button: boolean;
  red_button: boolean;
  system_fault: boolean;
  emergency_button: boolean;
  charging: boolean;
  initial_status: boolean;
}

export interface AmvBaseStatusMessage {
  header: BaseStatusHeader;
  base_status: BaseStatus;
}

// 3. ข้อมูลสถานีที่อ่านจาก CSV ผ่าน Service /read_station
export interface StationData {
  name: string;
  mode: string;
  timer: number;
  pin: string;
  x: number;
  y: number;
  z: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
  theta: number;
}

export interface ReadStationResponse {
  status: string;
  station_total: number;
  station_data: StationData[];
}

// ข้อมูลเส้นทางเชื่อมโยงระหว่างโหนด (Edges) จาก manual_track.csv
export interface TrackEdge {
  from_node: string;
  to_node: string;
  mode: string;
}

// ก้อนข้อมูลรวมสำหรับ Map & Route Manager
export interface MapLayoutData {
  stations: StationData[];
  waypoints: StationData[];
  tracks: TrackEdge[];
}

// 4. พิกัดตำแหน่งหุ่นยนต์จาก /amv_current_pose หรือ /amv_pose_tf
export interface RobotPose {
  x: number;
  y: number;
  theta: number; // องศา Yaw (Degrees)
}

// 5. โครงสร้าง Marker จาก visualization_msgs/Marker
export interface RosMarker {
  id: number;
  ns?: string;
  type: number; // 0 = ARROW, 1 = CUBE, 2 = SPHERE, 3 = CYLINDER, 4 = LINE_STRIP, 9 = TEXT_VIEW_FACING
  action?: number;
  pose: {
    position: { x: number; y: number; z: number };
    orientation?: { x: number; y: number; z: number; w: number };
  };
  scale?: { x: number; y: number; z: number };
  color?: { r: number; g: number; b: number; a: number };
  text?: string;
  points?: Array<{ x: number; y: number; z: number }>;
}

// 6. จุดพิกัดเส้นทาง 2D จาก nav_msgs/Path
export interface PathPoint {
  x: number;
  y: number;
}

// 7. ก้อน Telemetry รวมที่แคชไว้ใน RAM ของ Bun
export interface RobotTelemetry {
  connected: boolean;
  robotIp: string;
  lastUpdated: string;
  navigation: NavigationStatus | null;
  base: BaseStatus | null;
  pose: RobotPose | null;
  plannedPath?: PathPoint[];
  stationMarkers?: RosMarker[];
  waypointMarkers?: RosMarker[];
}
