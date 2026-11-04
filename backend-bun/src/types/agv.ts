// amv_service/NavigationStatus.msg
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

// amv_connect/BaseStatusStamped.msg
export interface BaseStatus {
  linear_velocity: number;
  angular_velocity: number;
  battery_level: number;        // % battery level
  ultrasonic: number;
  system_fault_code: number;
  motor_fault_code: number;
  robot_ready: boolean;
  robot_moving: boolean;
  stop_conf: boolean;
  auto_mode: boolean;
  linear_down_conf: boolean;    // pin down
  linear_up_conf: boolean;      // pin up
  green_button: boolean;
  red_button: boolean;
  system_fault: boolean;
  emergency_button: boolean;    
  charging: boolean;            
  initial_status: boolean;
}

// Telemetry รวมที่ Bun แคชไว้ใน RAM
export interface RobotTelemetry {
  connected: boolean;
  robotIp: string;
  lastUpdated: string;
  navigation: NavigationStatus | null;
  base: BaseStatus | null;
}
