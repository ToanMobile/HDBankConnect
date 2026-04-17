# WEBSOCKET_EVENTS.md — Smart Attendance V2

> Socket.IO over WebSocket. Server: NestJS Gateway.  
> Client: React PWA (admin dashboard). Mobile KHÔNG dùng WebSocket (dùng polling + local notification).

---

## 1. Connection

### Endpoint

```
ws://api.smartattendance.vn/socket.io
wss://api.smartattendance.vn/socket.io  ← production
```

### Handshake

```typescript
// web/src/hooks/useAttendanceWebSocket.ts
import { io, Socket } from 'socket.io-client';

const socket = io(process.env.VITE_WS_URL, {
  auth: {
    token: accessToken,   // JWT access token
  },
  transports: ['websocket'],
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
});
```

### Server-side Auth (NestJS)

```typescript
// backend/src/modules/realtime/ws-auth.guard.ts
@Injectable()
export class WsAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient();
    const token = client.handshake.auth?.token;
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      client.data.user = payload;
      return true;
    } catch {
      client.disconnect();
      return false;
    }
  }
}
```

---

## 2. Rooms (Socket.IO Rooms)

| Room | Tham gia | Mô tả |
|---|---|---|
| `global` | super_admin, hr | Nhận events toàn hệ thống |
| `branch:{branchId}` | branch_manager của branch đó | Nhận events của branch cụ thể |
| `employee:{employeeId}` | Chính employee đó | Nhận events cá nhân (chưa dùng ngay) |

### Auto-join room sau auth

```typescript
// backend/src/modules/realtime/attendance.gateway.ts
@WebSocketGateway({ cors: { origin: process.env.PWA_ORIGIN } })
export class AttendanceGateway implements OnGatewayConnection {
  handleConnection(client: Socket): void {
    const user = client.data.user as JwtPayload;

    // Join personal room
    client.join(`employee:${user.sub}`);

    // Join branch room
    client.join(`branch:${user.branchId}`);

    // Super admin / HR join global
    if ([EmployeeRole.SUPER_ADMIN, EmployeeRole.HR].includes(user.role)) {
      client.join('global');
    }
  }
}
```

---

## 3. Server → Client Events

### 3.1 `attendance:checkin`

Phát khi có auto-checkin hoặc manual-checkin thành công.

**Emit target:** `branch:{branchId}` và `global`

```typescript
interface AttendanceCheckinEvent {
  event: 'attendance:checkin';
  data: {
    attendance_id:  string;
    employee_id:    string;
    employee_name:  string;
    employee_code:  string;
    branch_id:      string;
    branch_name:    string;
    status:         'on_time' | 'late';
    check_in:       string;   // ISO 8601
    type:           'auto_checkin' | 'manual';
    location: {
      latitude:   number;
      longitude:  number;
    };
  };
}
```

**Example payload:**

```json
{
  "event": "attendance:checkin",
  "data": {
    "attendance_id":  "uuid",
    "employee_id":    "uuid",
    "employee_name":  "Nguyễn Văn A",
    "employee_code":  "NV001",
    "branch_id":      "uuid",
    "branch_name":    "CN Quận 1",
    "status":         "on_time",
    "check_in":       "2025-01-15T08:02:30+07:00",
    "type":           "auto_checkin",
    "location": {
      "latitude":   10.7769,
      "longitude":  106.7009
    }
  }
}
```

---

### 3.2 `attendance:checkout`

Phát khi có auto-checkout hoặc manual-checkout thành công.

**Emit target:** `branch:{branchId}` và `global`

```typescript
interface AttendanceCheckoutEvent {
  event: 'attendance:checkout';
  data: {
    attendance_id:    string;
    employee_id:      string;
    employee_name:    string;
    employee_code:    string;
    branch_id:        string;
    branch_name:      string;
    check_in:         string;   // ISO 8601
    check_out:        string;   // ISO 8601
    work_duration_minutes: number;
    type:             'auto_checkout' | 'manual';
  };
}
```

---

### 3.3 `fraud:detected`

Phát khi fraud detection service phát hiện vi phạm.

**Emit target:** `branch:{branchId}` và `global`

```typescript
interface FraudDetectedEvent {
  event: 'fraud:detected';
  data: {
    fraud_log_id:   string;
    employee_id:    string;
    employee_name:  string;
    employee_code:  string;
    branch_id:      string;
    branch_name:    string;
    fraud_type:     FraudType;   // xem fraud-log.entity.ts
    severity:       'low' | 'medium' | 'high' | 'critical';
    details:        Record<string, unknown>;
    occurred_at:    string;      // ISO 8601
  };
}
```

**Example payload:**

```json
{
  "event": "fraud:detected",
  "data": {
    "fraud_log_id":   "uuid",
    "employee_id":    "uuid",
    "employee_name":  "Trần Thị B",
    "employee_code":  "NV042",
    "branch_id":      "uuid",
    "branch_name":    "CN Bình Thạnh",
    "fraud_type":     "vpn_detected",
    "severity":       "high",
    "details": {
      "ip_address":   "185.220.x.x",
      "vpn_provider": "ProtonVPN (detected by ipinfo.io)"
    },
    "occurred_at":    "2025-01-15T08:03:11+07:00"
  }
}
```

---

### 3.4 `stats:update`

Phát mỗi 30 giây, cập nhật live stats cho dashboard.

**Emit target:** `global`

```typescript
interface StatsUpdateEvent {
  event: 'stats:update';
  data: {
    timestamp:        string;   // ISO 8601
    total_checkins_today:   number;
    total_on_time_today:    number;
    total_late_today:       number;
    total_absent_today:     number;
    active_employees_now:   number;   // đã checkin, chưa checkout
    fraud_alerts_today:     number;
    by_branch: Array<{
      branch_id:      string;
      branch_name:    string;
      checkins:       number;
      on_time:        number;
      late:           number;
      absent:         number;
    }>;
  };
}
```

---

### 3.5 `employee:status_change`

Phát khi admin thay đổi trạng thái nhân viên (activate/deactivate).

**Emit target:** `branch:{branchId}`

```typescript
interface EmployeeStatusChangeEvent {
  event: 'employee:status_change';
  data: {
    employee_id:    string;
    employee_name:  string;
    branch_id:      string;
    is_active:      boolean;
    changed_by:     string;   // admin employee_id
    changed_at:     string;   // ISO 8601
  };
}
```

---

### 3.6 `system:notification`

Thông báo hệ thống (maintenance, config reload...).

**Emit target:** `global`

```typescript
interface SystemNotificationEvent {
  event: 'system:notification';
  data: {
    type:     'info' | 'warning' | 'error';
    title:    string;
    message:  string;
    action?:  { label: string; url: string };
  };
}
```

---

## 4. Client → Server Events

### 4.1 `ping`

Keepalive từ client, server phản hồi `pong`.

```typescript
socket.emit('ping');
socket.on('pong', () => { /* connection alive */ });
```

### 4.2 `subscribe:branch`

HR / super_admin subscribe thêm branch cụ thể (nếu muốn filter).

```typescript
socket.emit('subscribe:branch', { branch_id: 'uuid' });
```

### 4.3 `unsubscribe:branch`

```typescript
socket.emit('unsubscribe:branch', { branch_id: 'uuid' });
```

---

## 5. Error Events (Server → Client)

```typescript
socket.on('exception', (error: { status: string; message: string }) => {
  // status: 'unauthorized' | 'forbidden' | 'not_found' | 'internal_error'
  console.error('WS Error:', error);
});
```

---

## 6. Server Implementation (NestJS)

```typescript
// backend/src/modules/realtime/attendance.gateway.ts
@WebSocketGateway({
  cors: { origin: process.env.PWA_ORIGIN, credentials: true },
  namespace: '/',
})
export class AttendanceGateway {
  @WebSocketServer()
  server: Server;

  // Gọi từ AttendanceService sau khi insert record
  emitCheckin(branchId: string, payload: AttendanceCheckinEvent['data']): void {
    this.server.to(`branch:${branchId}`).to('global').emit('attendance:checkin', payload);
  }

  emitFraud(branchId: string, payload: FraudDetectedEvent['data']): void {
    this.server.to(`branch:${branchId}`).to('global').emit('fraud:detected', payload);
  }

  // Chạy mỗi 30 giây bằng @Cron
  @Cron('*/30 * * * * *')
  async broadcastStats(): Promise<void> {
    const stats = await this.statsService.computeLiveStats();
    this.server.to('global').emit('stats:update', stats);
  }
}
```

---

## 7. Redis Pub/Sub (multi-instance)

Khi scale lên nhiều NestJS instances, dùng Redis adapter để sync events giữa các instance:

```typescript
// backend/src/app.module.ts
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';

// Setup Redis adapter để tất cả instances cùng emit
const pubClient = new Redis(redisConfig);
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

---

## 8. Client Usage Example (React PWA)

```typescript
// web/src/hooks/useAttendanceWebSocket.ts
export function useAttendanceWebSocket(): void {
  const socket = useRef<Socket | null>(null);
  const { addCheckin, addFraudAlert, updateStats } = useAttendanceStore();

  useEffect(() => {
    socket.current = io(WS_URL, {
      auth: { token: getAccessToken() },
      transports: ['websocket'],
    });

    socket.current.on('attendance:checkin', (data: AttendanceCheckinEvent['data']) => {
      addCheckin(data);
      toast.success(`${data.employee_name} vừa check-in — ${data.branch_name}`);
    });

    socket.current.on('fraud:detected', (data: FraudDetectedEvent['data']) => {
      addFraudAlert(data);
      toast.error(`Fraud: ${data.fraud_type} — ${data.employee_name}`, { duration: 8000 });
    });

    socket.current.on('stats:update', (data: StatsUpdateEvent['data']) => {
      updateStats(data);
    });

    return () => { socket.current?.disconnect(); };
  }, []);
}
```
