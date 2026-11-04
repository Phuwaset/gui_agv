import { CONFIG } from '../config';
import type { NavigationStatus, BaseStatus, RobotTelemetry } from '../types/agv';

export class RosBridgeService {
  private ws: WebSocket | null = null;
  private reconnectTimer: any = null;

  // เก็บ Telemetry ล่าสุดไว้ใน RAM ให้ Elysia Routes ดึงไปใช้ได้ตลอดเวลา
  public telemetry: RobotTelemetry = {
    connected: false,
    robotIp: CONFIG.ROBOT_WS_URL,
    lastUpdated: new Date().toISOString(),
    navigation: null,
    base: null,
  };

  constructor() {
    this.connect();
  }

  private connect() {
    console.log(`[ROS Bridge] Connecting to: ${CONFIG.ROBOT_WS_URL}`);

    try {
      this.ws = new WebSocket(CONFIG.ROBOT_WS_URL);

      // เมื่อเชื่อมต่อกับ rosbridge ติด
      this.ws.onopen = () => {
        console.log(`[ROS Bridge] Connected to: ${CONFIG.ROBOT_WS_URL}`);
        this.telemetry.connected = true;
        this.telemetry.lastUpdated = new Date().toISOString();

        // 1. ขอฟังสถานะการนำทางและสถานี (NavigationStatus)
        this.subscribe('/amv_navigation_status', 'amv_service/NavigationStatus');

        // 2. ขอฟังสถานะแบตเตอรี่, เซ็นเซอร์, และปุ่มกด (BaseStatusStamped)
        this.subscribe('/amv_base_status', 'amv_connect/BaseStatusStamped');
      };

      // เมื่อมีข้อมูลไหลมาจากหุ่นยนต์
      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data.toString());
          
          if (payload.op === 'publish') {
            this.handleTopic(payload.topic, payload.msg);
          }
        } catch (err) {
          console.error("[ROS Bridge] Error parsing JSON:", err);
        }
      };

      this.ws.onerror = () => {
        // เงียบไว้ ไม่ให้ Bun Server ล่มเมื่อหุ่นยังไม่เปิด
        this.telemetry.connected = false;
      };

      // เมื่อสายหลุด หรือหุ่นถูกปิด
      this.ws.onclose = () => {
        console.log(`[ROS Bridge] Disconnected... Attempting to reconnect in 3 seconds`);
        this.telemetry.connected = false;
        this.ws = null;

        // Auto-Reconnect ทุก 3 วินาที
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.connect(), 3000);
      };
    } catch (err) {
      console.error("[ROS Bridge] Error connecting:", err); 
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    }
  }

  // ส่ง JSON สั่ง Subscribe ไปยัง rosbridge
  private subscribe(topic: string, type: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const subMsg = {
        op: 'subscribe',
        topic: topic,
        type: type,
      };
      this.ws.send(JSON.stringify(subMsg));
      console.log(`[ROS Bridge] Subscribed: ${topic}`);
    }
  }

  // นำข้อมูลที่ได้จาก ROS มาอัปเดตใส่ State ใน RAM
  private handleTopic(topic: string, msg: any) {
    this.telemetry.lastUpdated = new Date().toISOString();

    if (topic === '/amv_navigation_status') {
      this.telemetry.navigation = msg as NavigationStatus;
    } else if (topic === '/amv_base_status') {
      // Defensive: รองรับทั้ง BaseStatusStamped (มี .base_status) และ BaseStatus ธรรมดา
      this.telemetry.base = (msg.base_status || msg) as BaseStatus;
    }
  }
}

// Export เป็น Singleton Instance ให้ทั้งโปรเจกต์ใช้ก้อนเดียวกัน
export const rosBridge = new RosBridgeService();