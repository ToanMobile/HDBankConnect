# AUTH_FLOW.md — eCheckAI V2

> JWT-based auth, access token 15min, refresh token 7 ngày.  
> Roles: `super_admin` > `hr` > `branch_manager` > `employee`

---

## 1. Roles & Permissions Matrix

| Action | employee | branch_manager | hr | super_admin |
|---|:---:|:---:|:---:|:---:|
| Xem lịch sử chấm công của mình | ✅ | ✅ | ✅ | ✅ |
| Checkin / Checkout | ✅ | ✅ | ✅ | ✅ |
| Xem attendance của branch mình | ❌ | ✅ | ✅ | ✅ |
| Xem attendance của mọi branch | ❌ | ❌ | ✅ | ✅ |
| Xem fraud logs của branch mình | ❌ | ✅ | ✅ | ✅ |
| Resolve fraud logs | ❌ | ✅ | ✅ | ✅ |
| Tạo / sửa lịch ca (schedule) | ❌ | ✅ | ✅ | ✅ |
| Quản lý nhân viên trong branch | ❌ | ✅ | ✅ | ✅ |
| Reset device registration | ❌ | ✅ | ✅ | ✅ |
| Tạo / sửa / xóa branch | ❌ | ❌ | ❌ | ✅ |
| Tạo / vô hiệu hóa employee | ❌ | ❌ | ✅ | ✅ |
| Xem thống kê toàn hệ thống | ❌ | ❌ | ✅ | ✅ |
| Export CSV | ❌ | ✅ | ✅ | ✅ |
| Quản lý admin accounts | ❌ | ❌ | ❌ | ✅ |

---

## 2. Auth Endpoints

```
POST   /api/v1/auth/login           → Đăng nhập
POST   /api/v1/auth/refresh         → Refresh access token
POST   /api/v1/auth/logout          → Đăng xuất (invalidate refresh token)
POST   /api/v1/auth/register-device → Đăng ký device lần đầu
DELETE /api/v1/auth/device          → Admin reset device của employee
POST   /api/v1/auth/forgot-password → Gửi OTP qua email/phone
POST   /api/v1/auth/reset-password  → Đặt lại mật khẩu với OTP
POST   /api/v1/auth/change-password → Đổi mật khẩu (khi đã login)
GET    /api/v1/auth/me              → Lấy thông tin user hiện tại
```

---

## 3. Login Flow

```
Client                          Server
  │                               │
  ├── POST /auth/login ─────────► │
  │   { email, password,          │
  │     device_id, device_model } │
  │                               ├── 1. Verify email exists
  │                               ├── 2. bcrypt.compare(password, hash)
  │                               ├── 3. Check isActive === true
  │                               │
  │                               ├── 4. ── DEVICE VALIDATION ──
  │                               │   ├── Chưa có registered_device_id
  │                               │   │   └── Cho login, redirect đăng ký device
  │                               │   │
  │                               │   └── Đã có registered_device_id
  │                               │       ├── device_id KHỚP → tiếp tục
  │                               │       └── device_id KHÔNG KHỚP
  │                               │           → 403 DEVICE_MISMATCH
  │                               │             (liên hệ admin để reset)
  │                               │
  │                               ├── 5. ── ONE DEVICE CHECK ──
  │                               │   └── Kiểm tra device_id đã được
  │                               │       registered_device_id của nhân viên
  │                               │       khác chưa (query employees table)
  │                               │       → có → 409 DEVICE_ALREADY_IN_USE
  │                               │
  │                               ├── 6. Generate access_token (JWT, 15min)
  │                               │       JWT payload chứa deviceId
  │                               ├── 7. Generate refresh_token (random 64 bytes)
  │                               ├── 8. Hash → ghi đè refresh_token_hash trong DB
  │                               │       (session cũ tự động bị invalidate)
  │                               ├── 9. Store active session vào Redis:
  │                               │       SET active_session:{employeeId}
  │                               │           { deviceId, loginAt } TTL 7d
  │                               ├── 10. Update last_login_at
  │ ◄──────────────────────────── │
  │   200 { access_token,         │
  │         refresh_token,        │
  │         expires_in: 900,      │
  │         user: { ... } }       │
```

**Kết quả của flow trên:**
- Nhân viên chỉ login được từ đúng device đã đăng ký
- Login mới → overwrite `refresh_token_hash` → device cũ mất session, tự logout khi refresh token hết hạn
- 1 device không thể đăng ký cho 2 nhân viên

### Login Request

```json
{
  "email": "employee@hdbank.com",
  "password": "SecurePass123!",
  "device_id": "unique-device-uuid",
  "device_model": "Samsung Galaxy S24"
}
```

### Login Response (200)

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5...",
    "refresh_token": "a3f9b2c1d4e5f6a7b8c9d0e1f2a3b4c5...",
    "expires_in": 900,
    "user": {
      "id": "uuid",
      "email": "employee@hdbank.com",
      "full_name": "Nguyễn Văn A",
      "role": "employee",
      "branch_id": "uuid",
      "branch_name": "CN Quận 1",
      "has_registered_device": true
    }
  }
}
```

---

## 4. JWT Payload

```typescript
interface JwtPayload {
  sub: string;         // employee.id
  email: string;
  role: EmployeeRole;
  branchId: string;
  deviceId: string;    // registered device id tại thời điểm login
  iat: number;
  exp: number;
}
```

### JWT Signing

```typescript
// backend/src/config/jwt.config.ts
export const jwtConfig = {
  secret:         process.env.JWT_SECRET,        // min 64 chars, random
  accessExpires:  '15m',
  refreshExpires: '7d',
  algorithm:      'HS256' as const,
};
```

---

## 5. Refresh Token Flow

```
Client                          Server
  │                               │
  ├── POST /auth/refresh ───────► │
  │   Authorization: Bearer       │
  │   <expired_access_token>      │
  │   Body: { refresh_token }     │
  │                               ├── Decode access_token (ignore exp)
  │                               │   → get employee.id
  │                               ├── Lookup employee → get refresh_token_hash
  │                               ├── bcrypt.compare(refresh_token, hash)
  │                               ├── Check refresh_token_expires > NOW()
  │                               ├── Check employee.isActive === true
  │                               ├── Generate new access_token
  │                               ├── Optionally rotate refresh_token
  │                               │   (nếu còn < 1 ngày → issue new one)
  │ ◄──────────────────────────── │
  │   200 { access_token,         │
  │         refresh_token?,       │
  │         expires_in: 900 }     │
```

**Error cases:**
- `401 REFRESH_TOKEN_INVALID` — hash không khớp
- `401 REFRESH_TOKEN_EXPIRED` — quá 7 ngày
- `401 DEVICE_SESSION_INVALID` — deviceId trong token không còn khớp registered device
- `403 ACCOUNT_DISABLED` — employee bị vô hiệu hóa

---

## 6. Device Registration Flow

Chỉ thực hiện 1 lần duy nhất sau khi login lần đầu.

```
Client                          Server
  │                               │
  ├── POST /auth/register-device  │
  │   Authorization: Bearer <tok> │
  │   { device_id, device_model,  │
  │     os_version }              │
  │                               ├── Verify JWT
  │                               ├── Check employee.registered_device_id
  │                               │   ├── null → register (update DB)
  │                               │   └── exists → 409 DEVICE_ALREADY_REGISTERED
  │                               ├── Set registered_device_id = device_id
  │                               ├── Set device_registered_at = NOW()
  │ ◄──────────────────────────── │
  │   201 { success: true }       │
```

**Admin reset device:**

```
DELETE /api/v1/auth/device
Body: { employee_id: "uuid" }
Auth: branch_manager hoặc hr hoặc super_admin
```

Sau khi reset: `registered_device_id = null`, nhân viên phải đăng ký lại device ở lần login tiếp theo.

---

## 7. Password Reset Flow

```
1. POST /auth/forgot-password
   Body: { email }
   → Generate OTP (6 chữ số, valid 10 phút)
   → Store hashed OTP in Redis: "otp:{email}" → TTL 600s
   → Gửi email với OTP

2. POST /auth/reset-password
   Body: { email, otp, new_password }
   → Verify OTP từ Redis
   → bcrypt.hash(new_password, 12)
   → Update password_hash trong DB
   → Delete "otp:{email}" từ Redis
   → Invalidate tất cả refresh tokens (set refresh_token_hash = null)
```

**OTP Redis key:** `otp:{email}` → value: bcrypt hash của OTP → TTL: 600s

---

## 8. Logout Flow

```
POST /auth/logout
Authorization: Bearer <access_token>
Body: { refresh_token }

→ Set employees.refresh_token_hash = null
→ Set employees.refresh_token_expires = null
→ (Optional) Add access_token jti to Redis blacklist với TTL = remaining exp time
→ 200 { success: true }
```

---

## 9. Guards & Decorators (NestJS)

```typescript
// backend/src/common/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

// backend/src/common/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<EmployeeRole[]>('roles', context.getHandler());
    if (!requiredRoles) return true;
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}

// backend/src/common/decorators/roles.decorator.ts
export const Roles = (...roles: EmployeeRole[]) => SetMetadata('roles', roles);

// Sử dụng trong controller:
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.BRANCH_MANAGER, EmployeeRole.SUPER_ADMIN)
@Get('fraud-logs')
getFraudLogs(): Promise<FraudLog[]> { ... }
```

### Device Session Guard

Chạy sau `JwtAuthGuard` trên **tất cả** attendance endpoints. Đảm bảo device trong JWT vẫn là device đang active:

```typescript
// backend/src/common/guards/device-session.guard.ts
@Injectable()
export class DeviceSessionGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req  = context.switchToHttp().getRequest();
    const user: JwtPayload = req.user;

    // Lấy employee từ Redis cache (đã có registered_device_id)
    const cached = await this.redis.get(`employee:${user.sub}`);
    const employee = cached ? JSON.parse(cached) : await this.employeeRepo.findOne(user.sub);

    // Device trong JWT phải khớp với device đã đăng ký
    if (employee.registeredDeviceId && user.deviceId !== employee.registeredDeviceId) {
      throw new UnauthorizedException('DEVICE_SESSION_INVALID');
      // Xảy ra khi: admin reset device, hoặc có login từ device khác
    }

    return true;
  }
}
```

**Khi nào bị kick:**
- Admin reset `registered_device_id` → token cũ có `deviceId` cũ → bị reject ngay lần request tiếp theo
- Không cần chờ access token expire

### Branch Scope Guard

`branch_manager` chỉ được xem data của branch mình. Guard tự động inject `branchId` vào query:

```typescript
// backend/src/common/guards/branch-scope.guard.ts
@Injectable()
export class BranchScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user: JwtPayload = req.user;

    if (user.role === EmployeeRole.SUPER_ADMIN || user.role === EmployeeRole.HR) {
      return true; // full access
    }

    // branch_manager chỉ access branch của mình
    const requestedBranchId = req.params.branchId ?? req.query.branchId;
    if (requestedBranchId && requestedBranchId !== user.branchId) {
      throw new ForbiddenException('ACCESS_DENIED_BRANCH_SCOPE');
    }

    req.scopedBranchId = user.branchId; // inject vào query
    return true;
  }
}
```

---

## 10. GET /auth/me Response

```json
{
  "success": true,
  "data": {
    "id":                   "uuid",
    "employee_code":        "NV001",
    "full_name":            "Nguyễn Văn A",
    "email":                "nva@hdbank.com",
    "phone":                "0901234567",
    "role":                 "employee",
    "branch_id":            "uuid",
    "branch_name":          "CN Quận 1",
    "has_registered_device": true,
    "device_registered_at": "2025-01-01T08:00:00+07:00",
    "is_active":            true,
    "last_login_at":        "2025-01-15T08:00:00+07:00"
  }
}
```

---

## 11. Manual Check-in Spec

`POST /api/v1/attendance/manual` — dùng khi auto-checkin thất bại và cần fallback thủ công.

**Ai được dùng:** mọi role (employee, branch_manager, hr, super_admin)

**Khác auto-checkin:**
- Vẫn yêu cầu WiFi BSSID + GPS (không bypass điều kiện vật lý)
- Không bị giới hạn `window_minutes` của schedule (nhân viên có thể checkin muộn hơn window)
- Status luôn là `late` nếu sau `checkin_time`, `pending` nếu admin cần xét duyệt thêm
- `type = 'manual'` trong attendance record
- Ghi chú `note` là bắt buộc (nhân viên phải giải thích lý do)

**Request body:** giống auto-checkin + thêm `note`:
```json
{
  "employee_id":    "uuid",
  "wifi_bssid":     "AA:BB:CC:DD:EE:FF",
  "wifi_ssid":      "HDBank_CN_Q1",
  "latitude":       10.7769,
  "longitude":      106.7009,
  "gps_accuracy":   12.5,
  "device_id":      "unique-device-uuid",
  "device_model":   "Samsung Galaxy S24",
  "os_version":     "Android 14",
  "app_version":    "1.2.0",
  "timestamp":      "2025-01-15T09:30:00+07:00",
  "is_vpn_active":  false,
  "is_mock_location": false,
  "note":           "Xe hỏng giữa đường, đến trễ"   ← BẮT BUỘC cho manual
}
```

---

## 12. Password Policy

Áp dụng ở cả DTO validation (backend) và form validation (frontend):

```
- Tối thiểu 8 ký tự
- Tối đa 72 ký tự (giới hạn bcrypt)
- Phải có ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số
- Không được chứa email hoặc employee_code của chính mình
- Không được giống 3 mật khẩu gần nhất (không track trong V1 — để V2)
```

**DTO validation (class-validator):**
```typescript
@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/, {
  message: 'Password must be 8-72 chars with uppercase, lowercase, and number',
})
password: string;
```

---

## 13. Security Checklist

- [ ] Passwords: bcrypt với cost factor 12
- [ ] Refresh tokens: stored hashed (bcrypt), never plain
- [ ] OTPs: stored hashed (bcrypt), Redis TTL 10 phút
- [ ] JWT secret: min 64 random bytes, lưu trong env
- [ ] Rate limit login: 5 attempts / 15 phút / IP → 429
- [ ] Rate limit OTP: 3 attempts / 1 giờ / email
- [ ] HTTPS only — HTTP redirect to HTTPS
- [ ] Authorization header only — không chấp nhận token trong URL query
- [ ] Token blacklist (Redis) khi logout hoặc password change
