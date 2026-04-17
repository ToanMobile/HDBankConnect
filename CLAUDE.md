# CLAUDE.md — eCheckAI V2 (Giải Pháp Số)

> **Role**: Senior Architect  
> **Project**: Hệ thống chấm công thông minh Zero-Touch cho 100 chi nhánh, 5.000 nhân viên  
> **Objective**: Xây dựng hệ thống auto check-in/check-out chạy ngầm theo lịch hẹn giờ, kết hợp WiFi BSSID + GPS Geofencing + Anti-fraud

---

## 1. Tech Stack

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: NestJS 10 (TypeScript strict mode)
- **Database**: PostgreSQL 16 (TypeORM, migrations bắt buộc)
- **Cache**: Redis 7 (cache branch config, rate limiting, pub/sub events)
- **Auth**: JWT (access token 15min, refresh token 7d)
- **Realtime**: WebSocket (Socket.IO) cho dashboard live updates

### Mobile App (Nhân viên)
- **Framework**: React Native 0.73+ (New Architecture enabled)
- **Background**: react-native-background-fetch (WorkManager Android / BGTaskScheduler iOS)
- **WiFi**: react-native-wifi-reborn (BSSID scan)
- **GPS**: react-native-geolocation-service (high accuracy)
- **Offline DB**: react-native-sqlite-storage (queue persistence)
- **State**: Zustand + AsyncStorage (schedule cache)

### Admin Dashboard (Manager)
- **Framework**: React 18 + Vite (PWA)
- **UI**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts (attendance trends, statistics)

### Infrastructure
- **Container**: Docker + docker-compose
- **Reverse Proxy**: Nginx (PWA serving + API proxy)
- **CI/CD**: GitHub Actions (lint → test → build → push image)

---

## 2. Project Structure

```
echeck-ai-v2/
├── CLAUDE.md                    # File này — rules cho AI
├── PROMPT_LOG.md                # Log toàn bộ prompt & review
├── README.md                    # Setup guide & scale strategy
├── docker-compose.yml           # Production stack
├── docker-compose.dev.yml       # Dev stack (hot reload)
│
├── backend/                     # NestJS API
│   ├── Dockerfile
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── config/
│   │   │   ├── database.config.ts
│   │   │   ├── redis.config.ts
│   │   │   └── jwt.config.ts
│   │   │
│   │   ├── common/              # Shared utilities
│   │   │   ├── decorators/
│   │   │   ├── guards/
│   │   │   ├── interceptors/
│   │   │   ├── filters/
│   │   │   ├── pipes/
│   │   │   └── utils/
│   │   │       ├── haversine.ts         # GPS distance calculation
│   │   │       └── time-window.ts       # Schedule window checker
│   │   │
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   └── strategies/
│   │   │   │
│   │   │   ├── branch/
│   │   │   │   ├── branch.module.ts
│   │   │   │   ├── branch.controller.ts
│   │   │   │   ├── branch.service.ts
│   │   │   │   ├── branch.entity.ts
│   │   │   │   └── dto/
│   │   │   │
│   │   │   ├── employee/
│   │   │   │   ├── employee.module.ts
│   │   │   │   ├── employee.controller.ts
│   │   │   │   ├── employee.service.ts
│   │   │   │   ├── employee.entity.ts
│   │   │   │   └── dto/
│   │   │   │
│   │   │   ├── schedule/
│   │   │   │   ├── schedule.module.ts
│   │   │   │   ├── schedule.controller.ts
│   │   │   │   ├── schedule.service.ts
│   │   │   │   ├── schedule.entity.ts
│   │   │   │   └── dto/
│   │   │   │
│   │   │   ├── attendance/
│   │   │   │   ├── attendance.module.ts
│   │   │   │   ├── attendance.controller.ts
│   │   │   │   ├── attendance.service.ts
│   │   │   │   ├── attendance.entity.ts
│   │   │   │   ├── dto/
│   │   │   │   └── validators/
│   │   │   │       ├── wifi-validator.ts
│   │   │   │       ├── geo-validator.ts
│   │   │   │       └── schedule-validator.ts
│   │   │   │
│   │   │   ├── fraud/
│   │   │   │   ├── fraud.module.ts
│   │   │   │   ├── fraud-detection.service.ts
│   │   │   │   ├── fraud-log.service.ts
│   │   │   │   └── fraud-log.entity.ts
│   │   │   │
│   │   │   ├── sync/
│   │   │   │   ├── sync.module.ts
│   │   │   │   ├── sync.controller.ts
│   │   │   │   ├── sync.service.ts
│   │   │   │   └── sync-queue.entity.ts
│   │   │   │
│   │   │   └── notification/
│   │   │       ├── notification.module.ts
│   │   │       ├── notification.service.ts
│   │   │       ├── telegram.adapter.ts
│   │   │       └── zalo.adapter.ts
│   │   │
│   │   └── migrations/
│   │
│   └── test/
│       ├── e2e/
│       │   ├── auto-checkin.e2e-spec.ts
│       │   └── anti-fraud.e2e-spec.ts
│       └── unit/
│
├── mobile/                      # React Native (nhân viên)
│   ├── package.json
│   ├── src/
│   │   ├── App.tsx
│   │   ├── navigation/
│   │   ├── screens/
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── AttendanceHistoryScreen.tsx
│   │   │   └── SettingsScreen.tsx
│   │   │
│   │   ├── services/
│   │   │   ├── BackgroundScheduler.ts      # Core: đăng ký scheduled tasks
│   │   │   ├── ConditionChecker.ts         # Core: verify WiFi + GPS + anti-fraud
│   │   │   ├── AutoCheckinExecutor.ts      # Core: orchestrate check-in/check-out
│   │   │   ├── ScheduleSyncService.ts      # Sync schedule config từ server
│   │   │   ├── OfflineQueueManager.ts      # Queue offline + batch sync
│   │   │   ├── IOSBackgroundService.ts     # iOS-specific BGTaskScheduler
│   │   │   └── NotificationService.ts      # Local notification kết quả
│   │   │
│   │   ├── utils/
│   │   │   ├── haversine.ts
│   │   │   ├── deviceInfo.ts
│   │   │   ├── vpnDetector.ts
│   │   │   └── mockLocationDetector.ts
│   │   │
│   │   ├── api/
│   │   │   └── attendanceApi.ts
│   │   │
│   │   ├── store/
│   │   │   └── useAttendanceStore.ts
│   │   │
│   │   └── db/
│   │       └── queue.schema.ts
│   │
│   ├── android/
│   │   └── app/src/main/java/.../
│   │       └── HeadlessTask.java           # Android fallback alarm
│   │
│   └── ios/
│       └── ECheckAI/
│           └── AppDelegate.swift           # iOS BGTask registration
│
└── web/                         # React PWA (admin dashboard)
    ├── Dockerfile
    ├── nginx.conf
    ├── src/
    │   ├── pages/
    │   │   ├── Dashboard.tsx
    │   │   ├── BranchConfig.tsx       ← nhập lat/lng bằng input, không cần map
    │   │   ├── ScheduleConfig.tsx
    │   │   └── EmployeeManagement.tsx
    │   │
    │   ├── components/
    │   │   ├── TimelinePreviewer.tsx
    │   │   ├── AttendanceTable.tsx
    │   │   └── StatsCards.tsx
    │   │
    │   └── hooks/
    │       └── useAttendanceWebSocket.ts
    │
    └── public/
```

---

## 3. Git Flow & Conventions

### Branch Strategy
```
main              ← production-ready, protected
├── develop       ← integration branch
│   ├── feature/SA-001-db-schema
│   ├── feature/SA-002-branch-api
│   ├── feature/SA-003-schedule-api
│   ├── feature/SA-004-auto-checkin-api
│   ├── feature/SA-005-fraud-detection
│   ├── feature/SA-006-background-scheduler
│   ├── feature/SA-007-condition-checker
│   ├── feature/SA-008-offline-queue
│   ├── feature/SA-009-dashboard-ui
│   ├── feature/SA-010-heatmap
│   ├── feature/SA-011-notification-bot
│   ├── feature/SA-012-docker
│   └── fix/SA-xxx-description
```

### Conventional Commits
```
feat(attendance): add auto-checkin API with schedule validation
fix(fraud): correct VPN detection on Android 14+
docs(readme): add scale strategy for 50k employees
refactor(branch): extract WiFi validation to shared util
test(e2e): add offline sync flow test
chore(docker): update postgres image to 16.2
```

### Rules
- Mỗi feature branch tạo từ `develop`, merge qua Pull Request
- PR phải có description mô tả thay đổi + screenshots (nếu UI)
- Squash merge vào develop, rebase merge vào main
- Tag version theo SemVer: v1.0.0, v1.1.0, ...

---

## 4. Architecture Principles

### SOLID
- **S**ingle Responsibility: Mỗi service chỉ làm 1 việc (FraudDetectionService chỉ detect, không xử lý attendance)
- **O**pen/Closed: Dùng Strategy Pattern cho notification adapters (Telegram, Zalo, Email)
- **L**iskov Substitution: Tất cả notification adapters implement chung NotificationAdapter interface
- **I**nterface Segregation: Controller không biết database, chỉ gọi Service
- **D**ependency Inversion: Service inject Repository qua constructor, không new trực tiếp

### Clean Architecture (4 layers)
```
┌─────────────────────────────────┐
│  Controllers (HTTP/WebSocket)   │ ← Presentation: nhận request, trả response
├─────────────────────────────────┤
│  Services (Business Logic)      │ ← Application: orchestrate, validate
├─────────────────────────────────┤
│  Entities (Domain Models)       │ ← Domain: business rules, invariants
├─────────────────────────────────┤
│  Repositories (Data Access)     │ ← Infrastructure: DB, Redis, external API
└─────────────────────────────────┘
```

### Error Handling
- Tất cả API trả format thống nhất: `{ success: boolean, data?: T, error?: { code: string, message: string } }`
- HTTP status codes đúng chuẩn: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 429 Too Many Requests, 500 Internal Server Error
- Global exception filter catch tất cả unhandled errors
- Log errors với correlation ID để trace request

---

## 5. Database Design Rules

### Naming Convention
- Table names: snake_case, số nhiều (`branches`, `employees`, `attendance_records`)
- Column names: snake_case (`check_in`, `branch_id`, `created_at`)
- Foreign keys: `{referenced_table_singular}_id` (`branch_id`, `employee_id`)
- Indexes: `idx_{table}_{columns}` (`idx_attendance_employee_checkin`)

### Required Columns (mọi table)
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

### Performance Rules
- Index mọi foreign key
- Composite index cho query pattern thường dùng: `(employee_id, check_in)` trên attendance
- Partition attendance table theo tháng khi data > 1M rows
- JSONB cho flexible data (location_snapshot, device_snapshot) — không normalize quá sâu
- Pagination bắt buộc: cursor-based cho mobile, offset-based cho dashboard
- Tối đa 50 records/page cho dashboard, 20 records/page cho mobile

---

## 6. API Design Rules

### RESTful Convention
```
GET    /api/v1/branches              → List branches (paginated)
POST   /api/v1/branches              → Create branch
GET    /api/v1/branches/:id          → Get branch detail
PUT    /api/v1/branches/:id          → Update branch
DELETE /api/v1/branches/:id          → Soft delete branch

GET    /api/v1/schedules             → List schedules by branch
POST   /api/v1/schedules             → Create schedule for branch
PUT    /api/v1/schedules/:id         → Update schedule
GET    /api/v1/schedules/my          → Get current employee's schedule

POST   /api/v1/attendance/auto-checkin   → Auto check-in (from mobile)
POST   /api/v1/attendance/auto-checkout  → Auto check-out (from mobile)
POST   /api/v1/attendance/manual         → Manual check-in (fallback)
GET    /api/v1/attendance              → List attendance (dashboard, paginated)
GET    /api/v1/attendance/stats        → Aggregated statistics

POST   /api/v1/sync/batch             → Batch sync offline records
GET    /api/v1/sync/status             → Check sync queue status

GET    /api/v1/attendance/export      → Export CSV (branch_manager, hr, super_admin)
  Query params: ?branch_id=&date_from=&date_to=&status=
  Response: Content-Type: text/csv
  Columns: employee_code, full_name, branch_name, work_date, check_in, check_out, status, note
  Max export: 31 ngày / lần (tránh timeout)
```

### Auto Check-in Request Body
```json
{
  "employee_id": "uuid",
  "wifi_bssid": "AA:BB:CC:DD:EE:FF",
  "wifi_ssid": "HDBank_CN_Q1",
  "latitude": 10.7769,
  "longitude": 106.7009,
  "gps_accuracy": 12.5,
  "device_id": "unique-device-uuid",
  "device_model": "Samsung Galaxy S24",
  "os_version": "Android 14",
  "app_version": "1.2.0",
  "timestamp": "2025-01-15T08:02:30+07:00",
  "is_vpn_active": false,
  "is_mock_location": false
}
```

### Auto Check-in Server Validation Flow
```
1. Parse & validate request body (class-validator)
2. Lookup employee → get branch_id (Redis cache: employee:{id})
3. Lookup branch config (Redis cache: branch:{id})
4. Lookup schedule for branch (Redis cache: schedule:{branch_id})
5. ── FRAUD CHECKS ──
   a. Verify device_id matches employee.registered_device_id
   b. Check is_vpn_active === false (reject if true)
   c. Check is_mock_location === false (reject if true)
   d. Server-side IP check against known VPN ranges (ipinfo.io)
   e. Rate limit: max 2 check-in per employee per day
6. ── CONDITION CHECKS ──
   a. WiFi BSSID in branch.wifi_bssids[] array
   b. GPS distance (haversine) ≤ branch.radius meters
   c. GPS accuracy ≤ 50m (reject if too inaccurate)
   d. Timestamp within schedule.checkin_time ± schedule.window_minutes
7. ── DETERMINE STATUS ──
   a. If timestamp ≤ schedule.checkin_time → status: "on_time"
   b. If timestamp > schedule.checkin_time AND within window → status: "late"
   c. If timestamp > window → reject (outside allowed time)
8. ── RECORD ──
   a. Insert attendance record with location_snapshot + device_snapshot
   b. Publish event to Redis: "attendance:checkin" (for WebSocket + notification)
9. Return: { success: true, data: { status, check_in_time, branch_name } }
```

---

## 7. Mobile Background Scheduler Design

### Android Flow
```
App Launch / Schedule Sync
    │
    ├── Fetch GET /api/v1/schedules/my
    ├── Save to AsyncStorage: { checkin: "08:00", checkout: "17:30", window: 15, days: [1,2,3,4,5] }
    │
    ├── Register BackgroundFetch periodic task (minimum interval 15min)
    │   └── On trigger:
    │       ├── Check: is today in active_days[]?
    │       ├── Check: is current time within checkin/checkout window?
    │       ├── If YES → run ConditionChecker
    │       │   ├── Scan WiFi BSSID
    │       │   ├── Get GPS position
    │       │   ├── Check VPN / Mock Location
    │       │   ├── All pass → call API /auto-checkin or /auto-checkout
    │       │   ├── API success → show local notification ✅
    │       │   ├── API fail (network) → save to OfflineQueue
    │       │   └── Condition fail → log locally, no action
    │       └── If NO → skip, return BackgroundFetch.RESULT_NO_DATA
    │
    └── Fallback: AlarmManager exact alarm at checkin_time - 5min
        └── Triggers HeadlessTask.java → same flow as above
```

### iOS Flow
```
App Launch / Schedule Sync
    │
    ├── Register BGAppRefreshTask (identifier: "com.smartattendance.autoCheckin")
    ├── Register BGAppRefreshTask (identifier: "com.smartattendance.autoCheckout")
    │   └── iOS decides when to run (approximate, not exact)
    │
    ├── ALSO register CLLocationManager.startMonitoringSignificantLocationChanges()
    │   └── On significant location change:
    │       ├── Check if within branch geofence
    │       ├── Check if within schedule time window
    │       └── If both YES → run ConditionChecker → API call
    │
    └── ALSO register CLCircularRegion geofence for branch location
        └── On didEnterRegion:
            ├── Check schedule time window
            └── If within window → run ConditionChecker → API call
```

### ConditionChecker Module
```typescript
interface CheckResult {
  passed: boolean;
  failures: string[];       // ["WIFI_MISMATCH", "OUTSIDE_GEOFENCE", ...]
  snapshot: {
    wifi_bssid: string | null;
    wifi_ssid: string | null;
    latitude: number;
    longitude: number;
    gps_accuracy: number;
    is_vpn_active: boolean;
    is_mock_location: boolean;
    device_id: string;
    timestamp: string;
    last_unlock_elapsed_minutes: number;  // phút kể từ lần mở khoá màn hình gần nhất
  };
}

// Execution order (fail-fast):
// 1. isWithinScheduleWindow()     → reject early if outside time
// 2. scanWiFiBSSID()              → reject if no matching BSSID
//    └─ WiFi yếu → retry 3 lần cách nhau 5s trước khi fail
//       vẫn fail → save to OfflineQueue (KHÔNG bỏ qua)
// 3. getGPSPosition()             → reject if outside geofence radius
// 4. checkVPN()                   → reject if VPN detected
// 5. checkMockLocation()          → reject if mock GPS enabled
// 6. verifyDeviceID()             → reject if device mismatch
// 7. checkLastUnlock()            → reject if device chưa được mở khoá
//    trong vòng 90 phút qua (chống device farming)
```

### Network Error Handling (tránh duplicate khi timeout)

```
API call /auto-checkin
    │
    ├── Success (2xx)          → mark done, show notification ✅
    │
    ├── Network timeout        → save to OfflineQueue với idempotency_key
    │   (> 10 giây)              = sha256(employee_id + type + work_date)
    │                            Server dùng key này để dedup khi sync
    │
    ├── 4xx (fraud/condition)  → log locally, KHÔNG lưu queue (đã bị reject đúng)
    │
    └── 5xx (server error)     → save to OfflineQueue, retry sau
```

**Idempotency key** = `sha256(employee_id + type + work_date)` — cùng nhân viên, cùng loại, cùng ngày chỉ tạo 1 record dù gửi bao nhiêu lần.

### Known Limitations (MVP — cần biometric ở V2)

| Attack | MVP mitigation | Còn lại |
|---|---|---|
| **Buddy punching** — A đưa phone cho B vào checkin dùm | Không chặn được hoàn toàn. Chỉ log `device_id` để audit sau | Cần Face ID / selfie verification (V2) |
| **Device farming** — để phone ở VP, remote trigger | `checkLastUnlock()`: từ chối nếu màn hình chưa unlock trong 90 phút | Giảm thiểu đáng kể, không chặn 100% |
| **WiFi yếu** — scan không ra BSSID | Retry 3 lần × 5s → nếu vẫn fail → lưu OfflineQueue, sync sau | Nhân viên không mất chấm công oan |
| **Timeout mạng** — không biết server nhận chưa | Idempotency key → server tự dedup khi sync | Không bao giờ duplicate record |

---

## 8. Scalability Strategy

### Current: 5,000 employees, 100 branches
- Single NestJS instance handles ~500 req/sec
- Peak load: 5,000 checkins in 15-minute window = ~5.5 req/sec (comfortable)
- Redis cache eliminates 90% of DB reads (branch config, schedule config, employee lookup)
- PostgreSQL handles 5,000 inserts/15min easily

### Future: 50,000 employees
- **Backend**: Horizontal scale to 3-5 NestJS instances behind Nginx load balancer
- **Database**: PostgreSQL read replicas for dashboard queries, primary for writes
- **Partitioning**: Attendance table partitioned by month (auto-prune after 2 years)
- **Cache**: Redis Cluster (3 nodes) for session + config + rate limiting
- **Queue**: Bull queue (Redis-backed) for async notification delivery
- **CDN**: CloudFront/Cloudflare for PWA static assets
- **Monitoring**: Prometheus + Grafana for API latency, error rates, queue depth

---

## 9. Security Rules

- JWT tokens in Authorization header (Bearer scheme), never in URL params
- WiFi BSSID list stored server-side only, mobile fetches via authenticated API
- Device registration: employee can only register 1 device, admin can reset
- Rate limiting: 10 req/min per employee on attendance endpoints
- All location data encrypted at rest (PostgreSQL pgcrypto)
- Fraud logs retained for 1 year minimum (compliance)
- API input validation via class-validator decorators on every DTO
- SQL injection prevention: TypeORM parameterized queries only, never raw SQL concatenation
- CORS: whitelist only PWA domain + mobile app bundle ID

---

## 10. Code Style

### TypeScript
- Strict mode enabled (`strict: true` in tsconfig.json)
- No `any` type — use `unknown` + type guards
- Explicit return types on all public methods
- Prefer `interface` over `type` for object shapes
- Use `enum` for fixed value sets (AttendanceStatus, FraudType)

### Naming
- Files: kebab-case (`fraud-detection.service.ts`)
- Classes: PascalCase (`FraudDetectionService`)
- Methods: camelCase (`checkVpnStatus()`)
- Constants: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
- Database: snake_case (see Section 5)

### Testing
- Unit tests: every service method, especially ConditionChecker logic
- E2E tests: complete auto-checkin flow (happy path + fraud scenarios)
- Minimum coverage target: 80% for services, 60% for controllers
- Test naming: `should_[expected]_when_[condition]`
