# DATABASE_SCHEMA.md — Smart Attendance V2

> PostgreSQL 16 + TypeORM. Mọi table đều có `id`, `created_at`, `updated_at`.  
> Migration bắt buộc — không dùng `synchronize: true` ở production.

---

## 1. Entity Relationship Overview

```
branches ──────────────────────────────────────┐
    │ 1                                         │
    │ ∞                                         │
employees ──── schedules (branch_id + dow)      │
    │ 1                                         │
    │ ∞                                         │
attendance_records ── fraud_logs               │
    │                                           │
sync_queue (offline buffer)                    │
    └── → attendance_records (khi sync thành công)
```

---

## 2. Bảng: `branches`

```sql
CREATE TABLE branches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  code            VARCHAR(50) UNIQUE NOT NULL,   -- VD: "HDBank_CN_Q1"
  address         TEXT,
  latitude        DECIMAL(10, 8) NOT NULL,
  longitude       DECIMAL(11, 8) NOT NULL,
  radius_meters   INTEGER NOT NULL DEFAULT 100,   -- geofence radius
  wifi_bssids     JSONB NOT NULL DEFAULT '[]',    -- ["AA:BB:CC:DD:EE:FF", ...]
  wifi_ssids      JSONB NOT NULL DEFAULT '[]',    -- ["HDBank_CN_Q1", ...]
  timezone            VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  telegram_chat_id    VARCHAR(50),                -- Telegram group chat ID (-100xxx) cho branch alerts
                                                  -- NULL = không gửi Telegram cho branch này
  is_active           BOOLEAN NOT NULL DEFAULT true,
  deleted_at          TIMESTAMPTZ,                -- soft delete
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_branches_code ON branches (code);
CREATE INDEX idx_branches_is_active ON branches (is_active) WHERE deleted_at IS NULL;
```

### TypeORM Entity

```typescript
// backend/src/modules/branch/branch.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn,
  OneToMany, Index,
} from 'typeorm';
import { Employee } from '../employee/employee.entity';
import { Schedule } from '../schedule/schedule.entity';

@Entity('branches')
export class Branch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Index({ unique: true })
  @Column({ length: 50 })
  code: string;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  longitude: number;

  @Column({ name: 'radius_meters', type: 'int', default: 100 })
  radiusMeters: number;

  @Column({ name: 'wifi_bssids', type: 'jsonb', default: [] })
  wifiBssids: string[];

  @Column({ name: 'wifi_ssids', type: 'jsonb', default: [] })
  wifiSsids: string[];

  @Column({ length: 50, default: 'Asia/Ho_Chi_Minh' })
  timezone: string;

  @Column({ name: 'telegram_chat_id', length: 50, nullable: true })
  telegramChatId: string | null;   // "-100123456789" hoặc null

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => Employee, (e) => e.branch)
  employees: Employee[];

  @OneToMany(() => Schedule, (s) => s.branch)
  schedules: Schedule[];

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

---

## 3. Bảng: `employees`

```sql
CREATE TABLE employees (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id             UUID NOT NULL REFERENCES branches(id),
  employee_code         VARCHAR(50) UNIQUE NOT NULL,   -- mã nhân viên nội bộ
  full_name             VARCHAR(255) NOT NULL,
  email                 VARCHAR(255) UNIQUE NOT NULL,
  phone                 VARCHAR(20),
  password_hash         VARCHAR(255) NOT NULL,
  role                  VARCHAR(20) NOT NULL DEFAULT 'employee',
                        -- VALUES: 'employee' | 'branch_manager' | 'hr' | 'super_admin'
  registered_device_id  VARCHAR(255),                  -- null = chưa đăng ký device
  device_registered_at  TIMESTAMPTZ,
  refresh_token_hash    VARCHAR(255),
  refresh_token_expires TIMESTAMPTZ,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  last_login_at         TIMESTAMPTZ,
  deleted_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_employees_branch_id ON employees (branch_id);
CREATE INDEX idx_employees_email ON employees (email);
CREATE INDEX idx_employees_employee_code ON employees (employee_code);
CREATE INDEX idx_employees_role ON employees (role);
```

### TypeORM Entity

```typescript
// backend/src/modules/employee/employee.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn,
  ManyToOne, OneToMany, JoinColumn, Index,
} from 'typeorm';
import { Branch } from '../branch/branch.entity';
import { AttendanceRecord } from '../attendance/attendance.entity';

export enum EmployeeRole {
  EMPLOYEE       = 'employee',
  BRANCH_MANAGER = 'branch_manager',
  HR             = 'hr',
  SUPER_ADMIN    = 'super_admin',
}

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'branch_id' })
  branchId: string;

  @ManyToOne(() => Branch, (b) => b.employees)
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Index({ unique: true })
  @Column({ name: 'employee_code', length: 50 })
  employeeCode: string;

  @Column({ name: 'full_name', length: 255 })
  fullName: string;

  @Index({ unique: true })
  @Column({ length: 255 })
  email: string;

  @Column({ length: 20, nullable: true })
  phone: string | null;

  @Column({ name: 'password_hash', length: 255, select: false })
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: EmployeeRole,
    default: EmployeeRole.EMPLOYEE,
  })
  role: EmployeeRole;

  @Column({ name: 'registered_device_id', length: 255, nullable: true })
  registeredDeviceId: string | null;

  @Column({ name: 'device_registered_at', type: 'timestamptz', nullable: true })
  deviceRegisteredAt: Date | null;

  @Column({ name: 'refresh_token_hash', length: 255, nullable: true, select: false })
  refreshTokenHash: string | null;

  @Column({ name: 'refresh_token_expires', type: 'timestamptz', nullable: true, select: false })
  refreshTokenExpires: Date | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @OneToMany(() => AttendanceRecord, (a) => a.employee)
  attendanceRecords: AttendanceRecord[];

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

---

## 4. Bảng: `schedules`

```sql
CREATE TABLE schedules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id        UUID NOT NULL REFERENCES branches(id),
  name             VARCHAR(255) NOT NULL,           -- VD: "Ca sáng T2-T6"
  checkin_time     TIME NOT NULL,                   -- VD: "08:00:00"
  checkout_time    TIME NOT NULL,                   -- VD: "17:30:00"
  window_minutes   INTEGER NOT NULL DEFAULT 15,     -- ±15 phút được tính on_time
  active_days      INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',
                   -- 0=CN, 1=T2, 2=T3, ..., 6=T7 (ISO weekday - 1)
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_schedules_branch_id ON schedules (branch_id);
CREATE INDEX idx_schedules_branch_active ON schedules (branch_id, is_active);
```

### TypeORM Entity

```typescript
// backend/src/modules/schedule/schedule.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Branch } from '../branch/branch.entity';

@Entity('schedules')
export class Schedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'branch_id' })
  branchId: string;

  @ManyToOne(() => Branch, (b) => b.schedules)
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'checkin_time', type: 'time' })
  checkinTime: string;   // "08:00:00"

  @Column({ name: 'checkout_time', type: 'time' })
  checkoutTime: string;  // "17:30:00"

  @Column({ name: 'window_minutes', type: 'int', default: 15 })
  windowMinutes: number;

  @Column({ name: 'active_days', type: 'int', array: true, default: [1, 2, 3, 4, 5] })
  activeDays: number[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

---

## 5. Bảng: `attendance_records`

```sql
CREATE TABLE attendance_records (
  id                UUID NOT NULL DEFAULT gen_random_uuid(),
  employee_id       UUID NOT NULL REFERENCES employees(id),
  branch_id         UUID NOT NULL REFERENCES branches(id),
  schedule_id       UUID REFERENCES schedules(id),
  type              VARCHAR(20) NOT NULL,
                    -- VALUES: 'auto_checkin' | 'auto_checkout' | 'manual'
  status            VARCHAR(20) NOT NULL,
                    -- VALUES: 'on_time' | 'late' | 'early_leave' | 'absent' | 'pending'
  check_in          TIMESTAMPTZ,
  check_out         TIMESTAMPTZ,
  work_date         DATE NOT NULL,
                    -- ⚠️ Lưu theo giờ VN (UTC+7): dùng hàm toVietnamDate() — xem mục 5.1
  location_snapshot JSONB NOT NULL DEFAULT '{}',    -- xem spec bên dưới
  device_snapshot   JSONB NOT NULL DEFAULT '{}',    -- xem spec bên dưới
  note              TEXT,
  is_flagged        BOOLEAN NOT NULL DEFAULT false, -- đã bị fraud flag
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, work_date)   -- work_date phải có trong PK của partitioned table
) PARTITION BY RANGE (work_date);

-- ⚠️ PostgreSQL không hỗ trợ FK tham chiếu vào partitioned table.
-- fraud_logs.attendance_id KHÔNG dùng FK constraint — validate ở application layer.

-- Tạo partitions: migration 005 tạo 12 tháng hiện tại + cron tạo tháng tiếp theo.
-- Script tạo partition (dùng trong migration và cron job):
-- CREATE TABLE attendance_records_YYYY_MM
--   PARTITION OF attendance_records
--   FOR VALUES FROM ('YYYY-MM-01') TO ('YYYY-MM+1-01');

-- Ví dụ tháng 1/2025:
CREATE TABLE attendance_records_2025_01
  PARTITION OF attendance_records
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Indexes phải tạo trên từng partition (PostgreSQL tự tạo local index khi dùng cú pháp sau):
CREATE INDEX idx_attendance_employee_checkin
  ON attendance_records (employee_id, check_in DESC);
CREATE INDEX idx_attendance_branch_workdate
  ON attendance_records (branch_id, work_date DESC);
CREATE INDEX idx_attendance_workdate
  ON attendance_records (work_date DESC);
CREATE INDEX idx_attendance_status
  ON attendance_records (status);
CREATE INDEX idx_attendance_flagged
  ON attendance_records (is_flagged) WHERE is_flagged = true;
```

### 5.1 Timezone Helper — `toVietnamDate()`

```typescript
// backend/src/common/utils/time-window.ts

const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Chuyển ISO timestamp sang ngày làm việc theo giờ VN.
 * VD: "2025-01-15T00:30:00Z" (= 07:30 UTC+7) → "2025-01-15"
 * VD: "2025-01-14T17:00:00Z" (= 00:00 UTC+7 ngày hôm sau) → "2025-01-15" ← ĐÚNG
 */
export function toVietnamDate(isoTimestamp: string): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: VN_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(isoTimestamp));
  // 'sv-SE' locale cho format YYYY-MM-DD
}
```

### 5.2 Partition Auto-Create Cron

```typescript
// backend/src/modules/attendance/partition-manager.service.ts

@Injectable()
export class PartitionManagerService {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  // Chạy lúc 00:01 ngày 20 hàng tháng — tạo partition tháng tiếp theo
  @Cron('1 0 20 * *')
  async createNextMonthPartition(): Promise<void> {
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    const year  = next.getFullYear();
    const month = String(next.getMonth() + 1).padStart(2, '0');
    const nextM = String(next.getMonth() + 2).padStart(2, '0');
    const nextY = next.getMonth() === 11 ? year + 1 : year;

    const tableName = `attendance_records_${year}_${month}`;
    const from = `${year}-${month}-01`;
    const to   = `${nextY}-${nextM}-01`;

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS ${tableName}
        PARTITION OF attendance_records
        FOR VALUES FROM ('${from}') TO ('${to}')
    `);
  }
}
```

Migration `005_create_attendance_partitions.ts` phải tạo sẵn 13 partitions (tháng hiện tại + 12 tháng tới).

### location_snapshot JSONB schema

```json
{
  "wifi_bssid":     "AA:BB:CC:DD:EE:FF",
  "wifi_ssid":      "HDBank_CN_Q1",
  "latitude":       10.7769,
  "longitude":      106.7009,
  "gps_accuracy":   12.5,
  "distance_meters": 45.2
}
```

### device_snapshot JSONB schema

```json
{
  "device_id":                  "unique-device-uuid",
  "device_model":               "Samsung Galaxy S24",
  "os_version":                 "Android 14",
  "app_version":                "1.2.0",
  "is_vpn_active":              false,
  "is_mock_location":           false,
  "ip_address":                 "118.69.x.x",
  "last_unlock_elapsed_minutes": 12
}
```

> `last_unlock_elapsed_minutes`: số phút kể từ lần mở khoá màn hình gần nhất.  
> Server reject nếu > 90 phút — dấu hiệu device để yên không có người dùng (device farming).

### TypeORM Entity

```typescript
// backend/src/modules/attendance/attendance.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Employee } from '../employee/employee.entity';
import { Branch } from '../branch/branch.entity';
import { Schedule } from '../schedule/schedule.entity';

export enum AttendanceType {
  AUTO_CHECKIN  = 'auto_checkin',
  AUTO_CHECKOUT = 'auto_checkout',
  MANUAL        = 'manual',
}

export enum AttendanceStatus {
  ON_TIME     = 'on_time',
  LATE        = 'late',
  EARLY_LEAVE = 'early_leave',
  ABSENT      = 'absent',
  PENDING     = 'pending',
}

export interface LocationSnapshot {
  wifi_bssid: string | null;
  wifi_ssid: string | null;
  latitude: number;
  longitude: number;
  gps_accuracy: number;
  distance_meters: number;
}

export interface DeviceSnapshot {
  device_id: string;
  device_model: string;
  os_version: string;
  app_version: string;
  is_vpn_active: boolean;
  is_mock_location: boolean;
  ip_address: string;
}

@Entity('attendance_records')
export class AttendanceRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'employee_id' })
  employeeId: string;

  @ManyToOne(() => Employee, (e) => e.attendanceRecords)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Index()
  @Column({ name: 'branch_id' })
  branchId: string;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ name: 'schedule_id', nullable: true })
  scheduleId: string | null;

  @ManyToOne(() => Schedule, { nullable: true })
  @JoinColumn({ name: 'schedule_id' })
  schedule: Schedule | null;

  @Column({ type: 'enum', enum: AttendanceType })
  type: AttendanceType;

  @Column({ type: 'enum', enum: AttendanceStatus })
  status: AttendanceStatus;

  @Column({ name: 'check_in', type: 'timestamptz', nullable: true })
  checkIn: Date | null;

  @Column({ name: 'check_out', type: 'timestamptz', nullable: true })
  checkOut: Date | null;

  @Index()
  @Column({ name: 'work_date', type: 'date' })
  workDate: string;

  @Column({ name: 'location_snapshot', type: 'jsonb', default: {} })
  locationSnapshot: LocationSnapshot;

  @Column({ name: 'device_snapshot', type: 'jsonb', default: {} })
  deviceSnapshot: DeviceSnapshot;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ name: 'is_flagged', default: false })
  isFlagged: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

---

## 6. Bảng: `fraud_logs`

```sql
CREATE TABLE fraud_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id       UUID NOT NULL REFERENCES employees(id),
  attendance_id     UUID,             -- ⚠️ KHÔNG dùng FK (partitioned table không hỗ trợ)
                                      -- Validate tồn tại ở application layer nếu cần
  fraud_type        VARCHAR(50) NOT NULL,
                    -- VALUES: xem FraudType enum bên dưới
  severity          VARCHAR(20) NOT NULL DEFAULT 'medium',
                    -- VALUES: 'low' | 'medium' | 'high' | 'critical'
  details           JSONB NOT NULL DEFAULT '{}',
  ip_address        VARCHAR(45),
  resolved_at       TIMESTAMPTZ,
  resolved_by       UUID REFERENCES employees(id),
  resolution_note   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fraud_logs_employee_id ON fraud_logs (employee_id);
CREATE INDEX idx_fraud_logs_fraud_type ON fraud_logs (fraud_type);
CREATE INDEX idx_fraud_logs_severity ON fraud_logs (severity);
CREATE INDEX idx_fraud_logs_created_at ON fraud_logs (created_at DESC);
CREATE INDEX idx_fraud_logs_unresolved ON fraud_logs (resolved_at) WHERE resolved_at IS NULL;
```

### TypeORM Entity

```typescript
// backend/src/modules/fraud/fraud-log.entity.ts
export enum FraudType {
  VPN_DETECTED            = 'vpn_detected',
  MOCK_LOCATION           = 'mock_location',
  DEVICE_MISMATCH         = 'device_mismatch',
  WIFI_MISMATCH           = 'wifi_mismatch',
  OUTSIDE_GEOFENCE        = 'outside_geofence',
  OUTSIDE_SCHEDULE_WINDOW = 'outside_schedule_window',
  RATE_LIMIT_EXCEEDED     = 'rate_limit_exceeded',
  SERVER_IP_VPN           = 'server_ip_vpn',
}

export enum FraudSeverity {
  LOW      = 'low',
  MEDIUM   = 'medium',
  HIGH     = 'high',
  CRITICAL = 'critical',
}
```

---

## 7. Bảng: `sync_queue`

```sql
CREATE TABLE sync_queue (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id      UUID NOT NULL REFERENCES employees(id),
  idempotency_key  VARCHAR(64) UNIQUE NOT NULL,
                   -- sha256(employee_id + type + work_date) — chống duplicate khi timeout
  type             VARCHAR(20) NOT NULL,   -- 'auto_checkin' | 'auto_checkout' | 'manual'
  payload          JSONB NOT NULL,         -- raw request body từ mobile
  status           VARCHAR(20) NOT NULL DEFAULT 'pending',
                   -- VALUES: 'pending' | 'processing' | 'success' | 'failed'
  retry_count      INTEGER NOT NULL DEFAULT 0,
  last_error       TEXT,
  synced_at        TIMESTAMPTZ,
  attendance_id    UUID,                   -- sau khi sync thành công (không FK vì partitioned)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_queue_employee_id ON sync_queue (employee_id);
CREATE INDEX idx_sync_queue_status ON sync_queue (status);
CREATE INDEX idx_sync_queue_pending ON sync_queue (created_at) WHERE status = 'pending';
```

---

## 8. Redis Key Patterns

| Key | Value | TTL | Mục đích |
|---|---|---|---|
| `employee:{uuid}` | JSON: `{ branchId, role, registeredDeviceId }` | 1 giờ | Tránh DB lookup mỗi request |
| `branch:{uuid}` | JSON: full branch config (wifiBssids, radius, lat, lng) | 6 giờ | Config ít thay đổi |
| `schedule:{branchId}` | JSON: active schedule list | 1 giờ | Cache schedule lookup |
| `rate:checkin:{employeeId}:{date}` | Integer: count (max=2) | hết ngày (seconds đến midnight +7) | **Business rule**: tối đa 2 checkin/ngày |
| `rate:api:{employeeId}` | Integer: sliding count (max=10) | 60s | **API throttle**: 10 req/phút chống spam |
| `session:{employeeId}` | String: access token fingerprint | 15 phút | Token tracking |
| `active_session:{employeeId}` | JSON: `{ deviceId, loginAt }` | 7 ngày | Validate 1 session tại 1 thời điểm |
| `otp:{email}` | bcrypt hash của OTP | 600s | Password reset OTP |
| `blacklist:jti:{jti}` | "1" | Còn đến exp của token | Token blacklist sau logout |

> **Phân biệt 2 rate limits:**  
> - `rate:checkin` — Business rule, giới hạn 2 lần checkin/ngày, reset lúc 00:00 UTC+7  
> - `rate:api` — API throttle, giới hạn 10 req/phút, sliding window, chống spam/brute force

### Cache invalidation

- Khi branch được update → `DEL branch:{uuid}`, `DEL schedule:{branchId}`
- Khi employee được update → `DEL employee:{uuid}`
- Khi schedule được update → `DEL schedule:{branchId}`

---

## 9. Migration Checklist

```
migrations/
├── 001_create_branches.ts               # branches table + indexes
├── 002_create_employees.ts              # employees table + indexes
├── 003_create_schedules.ts              # schedules table
├── 004_create_attendance_records.ts     # partitioned table + indexes
├── 005_create_attendance_partitions.ts  # tạo sẵn 13 partitions (hiện tại + 12 tháng tới)
├── 006_create_fraud_logs.ts             # fraud_logs (attendance_id KHÔNG có FK)
├── 007_create_sync_queue.ts             # sync_queue table
└── 008_seed_super_admin.ts              # xem mục Seeding bên dưới
```

### Seeding Super Admin (migration 008)

```typescript
// Đọc credentials từ env vars — KHÔNG hardcode
const email    = process.env.SEED_ADMIN_EMAIL    ?? 'admin@smartattendance.vn';
const password = process.env.SEED_ADMIN_PASSWORD ?? (() => { throw new Error('SEED_ADMIN_PASSWORD is required'); })();

await queryRunner.query(`
  INSERT INTO employees (employee_code, full_name, email, password_hash, role, branch_id, is_active)
  VALUES ('ADMIN001', 'Super Admin', $1, $2, 'super_admin',
    (SELECT id FROM branches LIMIT 1),  -- placeholder branch, admin không cần branch thực
    true)
  ON CONFLICT (email) DO NOTHING
`, [email, await bcrypt.hash(password, 12)]);
```

**Env vars cần có trước khi chạy migration:**
```dotenv
SEED_ADMIN_EMAIL=admin@smartattendance.vn
SEED_ADMIN_PASSWORD=VerySecurePassword123!
```

Chạy: `npm run migration:run`  
Rollback: `npm run migration:revert`
