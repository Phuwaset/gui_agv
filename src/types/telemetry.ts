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

export interface BaseStatus {
  battery_level: number;
  linear_velocity: number;
  angular_velocity: number;
  emergency_button: boolean;
  charging: boolean;
  linear_up_conf: boolean;
  linear_down_conf: boolean;
  green_button: boolean;
  red_button: boolean;
  auto_mode: boolean;
  robot_moving: boolean;
}

export interface RobotTelemetry {
  connected: boolean;
  robotIp: string;
  lastUpdated: string;
  navigation: NavigationStatus | null;
  base: BaseStatus | null;
}

