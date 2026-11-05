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

// 4. พิกัดตำแหน่งหุ่นยนต์จาก /amv_current_pose หรือ /amv_pose_tf
export interface RobotPose {
  x: number;
  y: number;
  theta: number; // องศา Yaw (Degrees)
}

// 5. ก้อน Telemetry รวมที่แคชไว้ใน RAM ของ Bun
export interface RobotTelemetry {
  connected: boolean;
  robotIp: string;
  lastUpdated: string;
  navigation: NavigationStatus | null;
  base: BaseStatus | null;
  pose: RobotPose | null;
}