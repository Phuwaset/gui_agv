import { Elysia } from 'elysia';
import { CONFIG } from './config';
import { rosBridge } from './services/rosBridge';

const app = new Elysia()
  // Health check พื้นฐาน
  .get('/', () => ({
    status: 'ONLINE',
    service: 'AGV Gateway Service',
    timestamp: new Date().toISOString()
  }))

  // Endpoint สำหรับดึงสถานะล่าสุดของหุ่นยนต์ (Telemetry)
  .get('/api/robot/telemetry', () => {
    return rosBridge.telemetry;
  })

  .listen(CONFIG.PORT);

console.log(`[INFO] [Server] Gateway running at http://${app.server?.hostname}:${app.server?.port}`);