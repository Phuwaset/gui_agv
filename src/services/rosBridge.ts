import { CONFIG } from "../config";
import type {
  NavigationStatus,
  BaseStatus,
  RobotTelemetry,
} from "../types/telemetry";

export class RosBridgeService {
  private ws: WebSocket | null = null;
  private reconnectTimer: any = null;
  private serviceCallbacks = new Map<
    string,
    { resolve: (val: any) => void; reject: (err: any) => void; timer: any }
  >();
  private serviceSeq = 0;

  // แคชสถานะล่าสุดไว้ใน RAM ให้เส้นทาง API ดึงไปใช้ได้ทันที
  public telemetry: RobotTelemetry = {
    connected: false,
    robotIp: CONFIG.ROBOT_WS_URL,
    lastUpdated: new Date().toISOString(),
    navigation: null,
    base: null,
    pose: null,
  };

  constructor() {
    this.connect();
  }

  private connect() {
    console.log(`[ROS Bridge] Connecting To : ${CONFIG.ROBOT_WS_URL}`);

    try {
      this.ws = new WebSocket(CONFIG.ROBOT_WS_URL);

      this.ws.onopen = () => {
        console.log(
          `[ROS Bridge] Connected with ${CONFIG.ROBOT_WS_URL}`,
        );
        this.telemetry.connected = true;
        this.telemetry.lastUpdated = new Date().toISOString();

        // 1. ขอฟังสถานะการนำทางและสถานี
        this.subscribe(
          "/amv_navigation_status",
          "amv_service/NavigationStatus",
        );

        // 2. ขอฟังสถานะแบตเตอรี่, เซ็นเซอร์, และปุ่มกด
        this.subscribe("/amv_base_status", "amv_connect/BaseStatusStamped");

        // 3. ขอฟังพิกัดตัวรถบนแผนที่ (จาก amv_pose_publish หรือ tf)
        this.subscribe("/amv_current_pose", "geometry_msgs/Pose2D");
        this.subscribe("/amv_pose_tf", "geometry_msgs/Pose");
        this.subscribe("/planned_path", "nav_msgs/Path");
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data.toString());
          if (payload.op === "publish") {
            this.handleTopic(payload.topic, payload.msg);
          } else if (payload.op === "service_response") {
            const cb = this.serviceCallbacks.get(payload.id);
            if (cb) {
              clearTimeout(cb.timer);
              this.serviceCallbacks.delete(payload.id);
              if (payload.result === false) {
                cb.reject(new Error(payload.values || "Service call failed"));
              } else {
                cb.resolve(payload.values);
              }
            }
          }
        } catch (err) {
          console.error("[ROS Bridge] Parse JSON error:", err);
        }
      };

      this.ws.onerror = () => {
        this.telemetry.connected = false;
      };

      this.ws.onclose = () => {
        console.log(`[ROS Bridge] Reconnect wait 3s `);
        this.telemetry.connected = false;
        this.ws = null;

        // เคลียร์ Service Callbacks ที่ค้างอยู่
        this.serviceCallbacks.forEach((cb) => {
          clearTimeout(cb.timer);
          cb.reject(new Error("Connection closed"));
        });
        this.serviceCallbacks.clear();

        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.connect(), 3000);
      };
    } catch (err) {
      console.error("[ROS Bridge] Error :", err);
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    }
  }

  private subscribe(topic: string, type: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const subMsg = {
        op: "subscribe",
        topic: topic,
        type: type,
      };
      this.ws.send(JSON.stringify(subMsg));
      console.log(`[ROS Bridge] Subscribed: ${topic}`);
    }
  }

  private handleTopic(topic: string, msg: any) {
    this.telemetry.lastUpdated = new Date().toISOString();

    if (topic === "/amv_navigation_status") {
      this.telemetry.navigation = msg as NavigationStatus;
    } else if (topic === "/amv_base_status") {
      this.telemetry.base = (msg.base_status || msg) as BaseStatus;
    } else if (
      topic === "/amv_current_pose" ||
      topic === "/amv_pose_tf" ||
      topic === "/amcl_pose"
    ) {
      if (typeof msg.x === "number" && typeof msg.y === "number") {
        this.telemetry.pose = {
          x: msg.x,
          y: msg.y,
          theta: typeof msg.theta === "number" ? msg.theta : 0,
        };
      } else {
        // รองรับ geometry_msgs/Pose, PoseStamped และ PoseWithCovarianceStamped
        const p = msg.position || msg.pose?.position || msg.pose?.pose?.position;
        const q = msg.orientation || msg.pose?.orientation || msg.pose?.pose?.orientation;
        if (p && q) {
          const siny_cosp = 2 * (q.w * q.z + (q.x || 0) * (q.y || 0));
          const cosy_cosp = 1 - 2 * ((q.y || 0) * (q.y || 0) + q.z * q.z);
          const yawDeg = (Math.atan2(siny_cosp, cosy_cosp) * 180) / Math.PI;

          this.telemetry.pose = {
            x: Number(p.x.toFixed(2)),
            y: Number(p.y.toFixed(2)),
            theta: Number(yawDeg.toFixed(1)),
          };
        }
      }
    }
  }

  public callService(
    service: string,
    args: Record<string, any> = {},
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return reject(new Error("ROS Bridge WebSocket is not connected"));
      }

      const id = `service_req_${++this.serviceSeq}`;
      const timer = setTimeout(() => {
        this.serviceCallbacks.delete(id);
        reject(new Error(`Service call ${service} timed out after 5000ms`));
      }, 5000);

      this.serviceCallbacks.set(id, { resolve, reject, timer });

      const reqMsg = {
        op: "call_service",
        id,
        service,
        args,
      };

      this.ws.send(JSON.stringify(reqMsg));
      console.log(`[INFO] [ROS Bridge] Call service: ${service} (id: ${id})`);
    });
  }
}

// Export เป็น Singleton Instance ใช้งานร่วมกันทั้งระบบ
export const rosBridge = new RosBridgeService();
