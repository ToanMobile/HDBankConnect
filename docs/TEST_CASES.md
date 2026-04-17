# TEST_CASES.md — eCheckAI V2
# Master Test Specification & Runnable Audit Loop Reference

> **Project**: eCheckAI V2 (Giải Pháp Số)
> **Last Updated**: 2026-04-16
> **Maintainer**: Senior Architect
> **Total Modules**: 14
> **Total Test Cases**: 100+

---

## ⚠️ AUDIT LOOP RULE — ĐỌC TRƯỚC KHI CHẠY TEST

```
╔══════════════════════════════════════════════════════════════════════╗
║                      AUDIT LOOP RULE                                ║
║                                                                      ║
║  Sau khi chạy test suite:                                           ║
║                                                                      ║
║  1. Nếu có test FAIL → đọc error message → tìm root cause          ║
║     → fix code → chạy lại toàn bộ suite                            ║
║                                                                      ║
║  2. Lặp cho đến khi TOÀN BỘ test xanh (0 failures)                ║
║                                                                      ║
║  3. KHÔNG được bỏ qua test bằng cách skip / comment / xit / xtest  ║
║                                                                      ║
║  4. KHÔNG được sửa expected value cho khớp với bug                  ║
║     → Fix CODE, không fix TEST                                      ║
║                                                                      ║
║  5. Nếu test case sai logic nghiệp vụ → mở issue → thảo luận       ║
║     trước khi sửa expected value                                    ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## Quy Ước Test Case

Mỗi test case có cấu trúc chuẩn:

| Field | Mô tả |
|---|---|
| **ID** | `{MODULE}-{NNN}` — ví dụ `AUTH-001` |
| **Type** | `unit` / `e2e` / `integration` |
| **Priority** | `P0` (critical) / `P1` (high) / `P2` (medium) |
| **Precondition** | Trạng thái DB/Cache cần thiết trước khi chạy |
| **Input** | Request body / params / headers |
| **Expected Output** | HTTP status + response body + side effects |
| **Notes** | Ghi chú thêm, edge cases |

---

## Module 1: Auth

### AUTH-001
- **Type**: e2e
- **Priority**: P0
- **Description**: Login thành công với credentials hợp lệ
- **Precondition**: Employee tồn tại, password đúng, account active, device đã registered
- **Input**:
  ```json
  POST /api/v1/auth/login
  {
    "employee_code": "EMP001",
    "password": "Correct@Pass1",
    "device_id": "device-uuid-registered"
  }
  ```
- **Expected Output**:
  - HTTP: `200 OK`
  - Body:
    ```json
    {
      "success": true,
      "data": {
        "access_token": "<jwt, expires 15min>",
        "refresh_token": "<jwt, expires 7d>",
        "user": {
          "id": "<uuid>",
          "employee_code": "EMP001",
          "full_name": "Nguyen Van A",
          "role": "employee",
          "branch_id": "<uuid>"
        }
      }
    }
    ```
  - Side effect: `refresh_token` được lưu vào Redis key `refresh:{employee_id}`
- **Notes**: access_token phải chứa `sub`, `role`, `branch_id`, `device_id` trong payload

---

### AUTH-002
- **Type**: e2e
- **Priority**: P0
- **Description**: Login sai password → trả 401
- **Precondition**: Employee tồn tại, account active
- **Input**:
  ```json
  POST /api/v1/auth/login
  {
    "employee_code": "EMP001",
    "password": "WrongPassword",
    "device_id": "device-uuid-registered"
  }
  ```
- **Expected Output**:
  - HTTP: `401 Unauthorized`
  - Body:
    ```json
    {
      "success": false,
      "error": {
        "code": "INVALID_CREDENTIALS",
        "message": "Mã nhân viên hoặc mật khẩu không đúng"
      }
    }
    ```
- **Notes**: Không tiết lộ rõ lý do (username sai hay password sai) để tránh user enumeration

---

### AUTH-003
- **Type**: e2e
- **Priority**: P0
- **Description**: Login đúng password nhưng device_id khác với device đã đăng ký → 403 DEVICE_MISMATCH
- **Precondition**: Employee tồn tại, `registered_device_id = "device-A"`, đang login bằng `"device-B"`
- **Input**:
  ```json
  POST /api/v1/auth/login
  {
    "employee_code": "EMP001",
    "password": "Correct@Pass1",
    "device_id": "device-B-different"
  }
  ```
- **Expected Output**:
  - HTTP: `403 Forbidden`
  - Body:
    ```json
    {
      "success": false,
      "error": {
        "code": "DEVICE_MISMATCH",
        "message": "Thiết bị không khớp. Vui lòng liên hệ admin để reset thiết bị."
      }
    }
    ```
- **Notes**: Tạo entry trong `fraud_logs` với type `DEVICE_MISMATCH`

---

### AUTH-004
- **Type**: e2e
- **Priority**: P0
- **Description**: Login với device đã đăng ký cho nhân viên khác → 409 DEVICE_ALREADY_IN_USE
- **Precondition**: `device-uuid-X` đã là `registered_device_id` của `EMP002`; `EMP001` chưa đăng ký device nào
- **Input**:
  ```json
  POST /api/v1/auth/login
  {
    "employee_code": "EMP001",
    "password": "Correct@Pass1",
    "device_id": "device-uuid-X"
  }
  ```
- **Expected Output**:
  - HTTP: `409 Conflict`
  - Body:
    ```json
    {
      "success": false,
      "error": {
        "code": "DEVICE_ALREADY_IN_USE",
        "message": "Thiết bị này đã được đăng ký cho nhân viên khác."
      }
    }
    ```

---

### AUTH-005
- **Type**: e2e
- **Priority**: P0
- **Description**: Login với account bị deactivate → 403 ACCOUNT_DISABLED
- **Precondition**: Employee tồn tại, `is_active = false`
- **Input**:
  ```json
  POST /api/v1/auth/login
  {
    "employee_code": "EMP003",
    "password": "Correct@Pass1",
    "device_id": "device-emp003"
  }
  ```
- **Expected Output**:
  - HTTP: `403 Forbidden`
  - Body:
    ```json
    {
      "success": false,
      "error": {
        "code": "ACCOUNT_DISABLED",
        "message": "Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ HR."
      }
    }
    ```

---

### AUTH-006
- **Type**: e2e
- **Priority**: P0
- **Description**: Refresh token hợp lệ → trả access_token mới
- **Precondition**: Employee đã login, có valid refresh_token trong Redis
- **Input**:
  ```json
  POST /api/v1/auth/refresh
  {
    "refresh_token": "<valid-refresh-token>"
  }
  ```
- **Expected Output**:
  - HTTP: `200 OK`
  - Body:
    ```json
    {
      "success": true,
      "data": {
        "access_token": "<new-jwt-15min>"
      }
    }
    ```
- **Notes**: Refresh token rotation — token cũ bị invalidate sau khi dùng

---

### AUTH-007
- **Type**: e2e
- **Priority**: P0
- **Description**: Refresh token hết hạn → 401 REFRESH_TOKEN_EXPIRED
- **Precondition**: Refresh token đã expired (> 7 ngày)
- **Input**:
  ```json
  POST /api/v1/auth/refresh
  {
    "refresh_token": "<expired-refresh-token>"
  }
  ```
- **Expected Output**:
  - HTTP: `401 Unauthorized`
  - Body:
    ```json
    {
      "success": false,
      "error": {
        "code": "REFRESH_TOKEN_EXPIRED",
        "message": "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
      }
    }
    ```

---

### AUTH-008
- **Type**: e2e
- **Priority**: P0
- **Description**: Refresh token sai (tampered/invalid) → 401 REFRESH_TOKEN_INVALID
- **Precondition**: Không có token hợp lệ
- **Input**:
  ```json
  POST /api/v1/auth/refresh
  {
    "refresh_token": "totally.invalid.token"
  }
  ```
- **Expected Output**:
  - HTTP: `401 Unauthorized`
  - Body:
    ```json
    {
      "success": false,
      "error": {
        "code": "REFRESH_TOKEN_INVALID",
        "message": "Token không hợp lệ."
      }
    }
    ```

---

### AUTH-009
- **Type**: e2e
- **Priority**: P1
- **Description**: Logout → refresh token bị invalidate, lần refresh sau fail
- **Precondition**: Employee đã đăng nhập, có valid refresh_token
- **Input**:
  ```json
  POST /api/v1/auth/logout
  Headers: Authorization: Bearer <valid-access-token>
  {
    "refresh_token": "<valid-refresh-token>"
  }
  ```
- **Expected Output** (step 1 — logout):
  - HTTP: `200 OK`
  - Body: `{ "success": true }`
  - Side effect: Redis key `refresh:{employee_id}` bị xóa
- **Expected Output** (step 2 — dùng token cũ sau logout):
  - HTTP: `401 Unauthorized`
  - Body: `{ "success": false, "error": { "code": "REFRESH_TOKEN_INVALID" } }`

---

### AUTH-010
- **Type**: e2e
- **Priority**: P1
- **Description**: Đăng ký device lần đầu → 201 CREATED
- **Precondition**: Employee tồn tại, `registered_device_id = null`
- **Input**:
  ```json
  POST /api/v1/auth/register-device
  Headers: Authorization: Bearer <valid-access-token>
  {
    "device_id": "new-device-uuid",
    "device_model": "iPhone 15 Pro",
    "os_version": "iOS 17.4"
  }
  ```
- **Expected Output**:
  - HTTP: `201 Created`
  - Body: `{ "success": true, "data": { "registered_at": "<timestamp>" } }`
  - Side effect: `employees.registered_device_id` được set, Redis cache `employee:{id}` invalidated

---

### AUTH-011
- **Type**: e2e
- **Priority**: P1
- **Description**: Đăng ký device khi đã có device đăng ký → 409 DEVICE_ALREADY_REGISTERED
- **Precondition**: Employee đã có `registered_device_id = "existing-device"`
- **Input**:
  ```json
  POST /api/v1/auth/register-device
  Headers: Authorization: Bearer <valid-access-token>
  {
    "device_id": "another-device-uuid",
    "device_model": "Samsung Galaxy S24",
    "os_version": "Android 14"
  }
  ```
- **Expected Output**:
  - HTTP: `409 Conflict`
  - Body:
    ```json
    {
      "success": false,
      "error": {
        "code": "DEVICE_ALREADY_REGISTERED",
        "message": "Bạn đã đăng ký thiết bị. Liên hệ admin để reset."
      }
    }
    ```

---

### AUTH-012
- **Type**: e2e
- **Priority**: P1
- **Description**: Forgot password → OTP gửi email, Redis key tồn tại 10 phút
- **Precondition**: Employee tồn tại với email `nva@hdbank.vn`
- **Input**:
  ```json
  POST /api/v1/auth/forgot-password
  {
    "employee_code": "EMP001"
  }
  ```
- **Expected Output**:
  - HTTP: `200 OK`
  - Body: `{ "success": true, "data": { "message": "OTP đã gửi về email đăng ký." } }`
  - Side effect: Redis key `otp:{employee_id}` tồn tại với TTL 600s; email được gửi

---

### AUTH-013
- **Type**: e2e
- **Priority**: P0
- **Description**: Reset password với OTP đúng → password thay đổi, toàn bộ session cũ bị kick
- **Precondition**: Redis key `otp:{employee_id} = "123456"`, TTL còn hạn
- **Input**:
  ```json
  POST /api/v1/auth/reset-password
  {
    "employee_code": "EMP001",
    "otp": "123456",
    "new_password": "NewSecure@Pass2"
  }
  ```
- **Expected Output**:
  - HTTP: `200 OK`
  - Body: `{ "success": true }`
  - Side effects:
    1. `employees.password_hash` cập nhật
    2. Redis key `otp:{employee_id}` bị xóa
    3. Redis key `refresh:{employee_id}` bị xóa (kick session cũ)

---

### AUTH-014
- **Type**: e2e
- **Priority**: P1
- **Description**: Reset password với OTP sai → 400
- **Precondition**: Redis key `otp:{employee_id} = "123456"`
- **Input**:
  ```json
  POST /api/v1/auth/reset-password
  {
    "employee_code": "EMP001",
    "otp": "999999",
    "new_password": "NewSecure@Pass2"
  }
  ```
- **Expected Output**:
  - HTTP: `400 Bad Request`
  - Body: `{ "success": false, "error": { "code": "OTP_INVALID", "message": "OTP không đúng." } }`

---

### AUTH-015
- **Type**: e2e
- **Priority**: P1
- **Description**: Reset password với OTP hết hạn → 400
- **Precondition**: Redis key `otp:{employee_id}` không tồn tại (đã TTL expire)
- **Input**:
  ```json
  POST /api/v1/auth/reset-password
  {
    "employee_code": "EMP001",
    "otp": "123456",
    "new_password": "NewSecure@Pass2"
  }
  ```
- **Expected Output**:
  - HTTP: `400 Bad Request`
  - Body: `{ "success": false, "error": { "code": "OTP_EXPIRED", "message": "OTP đã hết hạn. Vui lòng yêu cầu lại." } }`

---

### AUTH-016
- **Type**: e2e
- **Priority**: P1
- **Description**: Change password thành công → session cũ bị kick
- **Precondition**: Employee đã đăng nhập, có valid session
- **Input**:
  ```json
  POST /api/v1/auth/change-password
  Headers: Authorization: Bearer <valid-access-token>
  {
    "current_password": "CurrentPass@1",
    "new_password": "NewPass@2026"
  }
  ```
- **Expected Output**:
  - HTTP: `200 OK`
  - Body: `{ "success": true }`
  - Side effects: `employees.password_hash` cập nhật, Redis key `refresh:{employee_id}` xóa

---

### AUTH-017
- **Type**: e2e
- **Priority**: P1
- **Description**: GET /auth/me → trả đúng user info của token hiện tại
- **Precondition**: Employee đã đăng nhập với valid access_token
- **Input**:
  ```
  GET /api/v1/auth/me
  Headers: Authorization: Bearer <valid-access-token>
  ```
- **Expected Output**:
  - HTTP: `200 OK`
  - Body:
    ```json
    {
      "success": true,
      "data": {
        "id": "<uuid>",
        "employee_code": "EMP001",
        "full_name": "Nguyen Van A",
        "role": "employee",
        "branch_id": "<uuid>",
        "branch_name": "Chi nhánh Quận 1",
        "registered_device_id": "device-uuid",
        "is_active": true
      }
    }
    ```

---

### AUTH-018
- **Type**: e2e
- **Priority**: P0
- **Description**: Admin reset device → nhân viên bị kick ngay lần request tiếp theo (DeviceSessionGuard)
- **Precondition**: `EMP001` đang có session hợp lệ; admin có role `super_admin`
- **Input (step 1 — admin reset)**:
  ```json
  POST /api/v1/employees/{emp001_id}/reset-device
  Headers: Authorization: Bearer <super_admin_access_token>
  ```
- **Input (step 2 — emp001 thực hiện attendance request)**:
  ```json
  POST /api/v1/attendance/auto-checkin
  Headers: Authorization: Bearer <emp001_old_access_token>
  { ... }
  ```
- **Expected Output (step 1)**: HTTP `200 OK`
- **Expected Output (step 2)**:
  - HTTP: `401 Unauthorized`
  - Body: `{ "success": false, "error": { "code": "DEVICE_SESSION_INVALID" } }`
  - Side effect: Redis cache `employee:{emp001_id}` invalidated ngay sau step 1

---

## Module 2: Branch

### BRANCH-001
- **Type**: e2e
- **Priority**: P0
- **Description**: super_admin tạo branch → 201
- **Precondition**: Không có branch với code đã dùng
- **Input**:
  ```json
  POST /api/v1/branches
  Headers: Authorization: Bearer <super_admin_token>
  {
    "name": "Chi nhánh Quận 1",
    "code": "CN-Q1",
    "address": "123 Nguyen Hue, Q1, HCM",
    "latitude": 10.7769,
    "longitude": 106.7009,
    "radius_meters": 100,
    "wifi_bssids": ["AA:BB:CC:DD:EE:FF", "11:22:33:44:55:66"],
    "telegram_chat_id": "-100123456789"
  }
  ```
- **Expected Output**:
  - HTTP: `201 Created`
  - Body:
    ```json
    {
      "success": true,
      "data": {
        "id": "<uuid>",
        "name": "Chi nhánh Quận 1",
        "code": "CN-Q1",
        "is_active": true,
        "created_at": "<timestamp>"
      }
    }
    ```
  - Side effect: Redis cache `branch:{id}` được set

---

### BRANCH-002
- **Type**: e2e
- **Priority**: P0
- **Description**: employee cố tạo branch → 403 Forbidden
- **Precondition**: User có role `employee`
- **Input**:
  ```json
  POST /api/v1/branches
  Headers: Authorization: Bearer <employee_token>
  { "name": "...", "code": "CN-X", ... }
  ```
- **Expected Output**:
  - HTTP: `403 Forbidden`
  - Body: `{ "success": false, "error": { "code": "FORBIDDEN", "message": "Không có quyền thực hiện." } }`

---

### BRANCH-003
- **Type**: e2e
- **Priority**: P1
- **Description**: Tạo branch trùng code → 409 Conflict
- **Precondition**: Branch với code `CN-Q1` đã tồn tại
- **Input**:
  ```json
  POST /api/v1/branches
  Headers: Authorization: Bearer <super_admin_token>
  { "name": "Chi nhánh Quận 1 Mới", "code": "CN-Q1", ... }
  ```
- **Expected Output**:
  - HTTP: `409 Conflict`
  - Body: `{ "success": false, "error": { "code": "BRANCH_CODE_DUPLICATE", "message": "Mã chi nhánh đã tồn tại." } }`

---

### BRANCH-004
- **Type**: e2e
- **Priority**: P1
- **Description**: Lấy danh sách branch có pagination
- **Precondition**: 15 branch tồn tại trong DB
- **Input**:
  ```
  GET /api/v1/branches?page=1&limit=10
  Headers: Authorization: Bearer <super_admin_token>
  ```
- **Expected Output**:
  - HTTP: `200 OK`
  - Body:
    ```json
    {
      "success": true,
      "data": {
        "items": [ /* 10 branches */ ],
        "total": 15,
        "page": 1,
        "limit": 10,
        "total_pages": 2
      }
    }
    ```

---

### BRANCH-005
- **Type**: e2e
- **Priority**: P1
- **Description**: Lấy detail một branch
- **Precondition**: Branch tồn tại
- **Input**:
  ```
  GET /api/v1/branches/{branch_id}
  Headers: Authorization: Bearer <super_admin_token>
  ```
- **Expected Output**:
  - HTTP: `200 OK`
  - Body: đủ các field: `id, name, code, address, latitude, longitude, radius_meters, wifi_bssids, telegram_chat_id, is_active, created_at, updated_at`

---

### BRANCH-006
- **Type**: e2e
- **Priority**: P1
- **Description**: Cập nhật branch (tên, WiFi BSSIDs, radius, telegram_chat_id)
- **Precondition**: Branch tồn tại, user là `super_admin`
- **Input**:
  ```json
  PUT /api/v1/branches/{branch_id}
  Headers: Authorization: Bearer <super_admin_token>
  {
    "name": "Chi nhánh Quận 1 - Tòa nhà mới",
    "radius_meters": 150,
    "wifi_bssids": ["AA:BB:CC:DD:EE:FF", "77:88:99:AA:BB:CC"],
    "telegram_chat_id": "-100987654321"
  }
  ```
- **Expected Output**:
  - HTTP: `200 OK`
  - Side effects: Redis cache `branch:{id}` invalidated và set lại với dữ liệu mới

---

### BRANCH-007
- **Type**: e2e
- **Priority**: P1
- **Description**: Soft delete branch → `is_active = false`, record vẫn còn trong DB
- **Precondition**: Branch tồn tại
- **Input**:
  ```
  DELETE /api/v1/branches/{branch_id}
  Headers: Authorization: Bearer <super_admin_token>
  ```
- **Expected Output**:
  - HTTP: `200 OK`
  - DB: `branches.is_active = false`, `deleted_at = NOW()`, record vẫn còn
  - Side effect: Redis cache `branch:{id}` xóa

---

### BRANCH-008
- **Type**: e2e
- **Priority**: P2
- **Description**: Xóa branch đang có nhân viên → vẫn xóa được (soft delete, không cascade)
- **Precondition**: Branch có 10 nhân viên
- **Input**:
  ```
  DELETE /api/v1/branches/{branch_id}
  Headers: Authorization: Bearer <super_admin_token>
  ```
- **Expected Output**:
  - HTTP: `200 OK`
  - DB: `branches.is_active = false`; employees vẫn còn `branch_id` cũ
  - Notes: Nhân viên thuộc branch đã xóa không thể checkin (branch không active)

---

## Module 3: Schedule

### SCHEDULE-001
- **Type**: e2e
- **Priority**: P0
- **Description**: Tạo schedule cho branch → 201
- **Precondition**: Branch tồn tại, user là `super_admin` hoặc `branch_manager` của branch đó
- **Input**:
  ```json
  POST /api/v1/schedules
  Headers: Authorization: Bearer <super_admin_token>
  {
    "branch_id": "<branch_uuid>",
    "checkin_time": "08:00",
    "checkout_time": "17:30",
    "window_minutes": 15,
    "active_days": [1, 2, 3, 4, 5]
  }
  ```
- **Expected Output**:
  - HTTP: `201 Created`
  - Body: `{ "success": true, "data": { "id": "<uuid>", "branch_id": "...", "checkin_time": "08:00", ... } }`
  - Side effect: Redis cache `schedule:{branch_id}` set

---

### SCHEDULE-002
- **Type**: e2e
- **Priority**: P1
- **Description**: Cập nhật schedule (giờ, window, active_days)
- **Precondition**: Schedule tồn tại
- **Input**:
  ```json
  PUT /api/v1/schedules/{schedule_id}
  Headers: Authorization: Bearer <super_admin_token>
  {
    "checkin_time": "08:30",
    "window_minutes": 20,
    "active_days": [1, 2, 3, 4, 5, 6]
  }
  ```
- **Expected Output**:
  - HTTP: `200 OK`
  - Side effect: Redis `schedule:{branch_id}` invalidated và set lại

---

### SCHEDULE-003
- **Type**: e2e
- **Priority**: P0
- **Description**: GET /schedules/my → nhân viên lấy schedule của branch mình
- **Precondition**: Employee thuộc branch có schedule đã cấu hình
- **Input**:
  ```
  GET /api/v1/schedules/my
  Headers: Authorization: Bearer <employee_token>
  ```
- **Expected Output**:
  - HTTP: `200 OK`
  - Body:
    ```json
    {
      "success": true,
      "data": {
        "branch_id": "<uuid>",
        "checkin_time": "08:00",
        "checkout_time": "17:30",
        "window_minutes": 15,
        "active_days": [1, 2, 3, 4, 5],
        "timezone": "Asia/Ho_Chi_Minh"
      }
    }
    ```

---

### SCHEDULE-004
- **Type**: e2e
- **Priority**: P1
- **Description**: Lấy schedules theo branch_id
- **Precondition**: Branch có schedule
- **Input**:
  ```
  GET /api/v1/schedules?branch_id={branch_id}
  Headers: Authorization: Bearer <branch_manager_token>
  ```
- **Expected Output**:
  - HTTP: `200 OK`
  - Body: array schedules của branch đó

---

## Module 4: Employee

### EMP-001
- **Type**: e2e
- **Priority**: P0
- **Description**: HR tạo employee → 201
- **Precondition**: User có role `hr` hoặc `super_admin`; branch tồn tại
- **Input**:
  ```json
  POST /api/v1/employees
  Headers: Authorization: Bearer <hr_token>
  {
    "employee_code": "EMP100",
    "full_name": "Tran Thi B",
    "email": "ttb@hdbank.vn",
    "phone": "0909090909",
    "branch_id": "<branch_uuid>",
    "role": "employee",
    "password": "DefaultPass@2026"
  }
  ```
- **Expected Output**:
  - HTTP: `201 Created`
  - Body: `{ "success": true, "data": { "id": "<uuid>", "employee_code": "EMP100", ... } }`

---

### EMP-002
- **Type**: e2e
- **Priority**: P0
- **Description**: Employee cố tạo employee → 403 Forbidden
- **Precondition**: User có role `employee`
- **Input**:
  ```json
  POST /api/v1/employees
  Headers: Authorization: Bearer <employee_token>
  { ... }
  ```
- **Expected Output**: HTTP `403 Forbidden`

---

### EMP-003
- **Type**: e2e
- **Priority**: P1
- **Description**: Activate / Deactivate employee
- **Precondition**: Employee tồn tại
- **Input**:
  ```json
  PATCH /api/v1/employees/{emp_id}/status
  Headers: Authorization: Bearer <hr_token>
  { "is_active": false }
  ```
- **Expected Output**:
  - HTTP: `200 OK`
  - DB: `employees.is_active = false`
  - Side effect: Redis `employee:{emp_id}` invalidated; existing sessions sẽ bị từ chối

---

### EMP-004
- **Type**: e2e
- **Priority**: P1
- **Description**: branch_manager chỉ quản lý được employee trong branch mình; truy cập employee branch khác → 403
- **Precondition**: `manager-A` quản lý `branch-A`; `EMP200` thuộc `branch-B`
- **Input**:
  ```json
  GET /api/v1/employees/{emp200_id}
  Headers: Authorization: Bearer <manager_a_token>
  ```
- **Expected Output**:
  - HTTP: `403 Forbidden`
  - Body: `{ "success": false, "error": { "code": "FORBIDDEN" } }`

---

### EMP-005
- **Type**: e2e
- **Priority**: P1
- **Description**: HR xem được employee mọi branch
- **Precondition**: HR có role `hr`; employee thuộc branch khác
- **Input**:
  ```
  GET /api/v1/employees/{any_emp_id}
  Headers: Authorization: Bearer <hr_token>
  ```
- **Expected Output**: HTTP `200 OK` với đầy đủ thông tin employee

---

## Module 5: Attendance — Auto Check-in

### ATT-CI-001
- **Type**: e2e
- **Priority**: P0
- **Description**: Đúng WiFi + GPS + đúng giờ → 201, status: on_time
- **Precondition**: Branch có `wifi_bssids = ["AA:BB:CC:DD:EE:FF"]`, `radius_meters = 100`; schedule `checkin_time = 08:00`, `window = 15`; thời điểm gửi request là `08:02 UTC+7`; employee chưa checkin hôm nay
- **Input**:
  ```json
  POST /api/v1/attendance/auto-checkin
  Headers: Authorization: Bearer <employee_token>
  {
    "employee_id": "<uuid>",
    "wifi_bssid": "AA:BB:CC:DD:EE:FF",
    "wifi_ssid": "HDBank_CN_Q1",
    "latitude": 10.7769,
    "longitude": 106.7009,
    "gps_accuracy": 12.5,
    "device_id": "registered-device-uuid",
    "device_model": "Samsung Galaxy S24",
    "os_version": "Android 14",
    "app_version": "1.2.0",
    "timestamp": "2026-04-16T08:02:30+07:00",
    "is_vpn_active": false,
    "is_mock_location": false
  }
  ```
- **Expected Output**:
  - HTTP: `201 Created`
  - Body:
    ```json
    {
      "success": true,
      "data": {
        "attendance_id": "<uuid>",
        "status": "on_time",
        "check_in_time": "2026-04-16T08:02:30+07:00",
        "branch_name": "Chi nhánh Quận 1",
        "work_date": "2026-04-16"
      }
    }
    ```
  - Side effect: Redis event `attendance:checkin` published

---

### ATT-CI-002
- **Type**: e2e
- **Priority**: P0
- **Description**: Đúng WiFi + GPS + muộn trong window → 201, status: late
- **Precondition**: Như ATT-CI-001 nhưng timestamp là `08:10 UTC+7` (muộn 10 phút, window 15 phút)
- **Input**: Như ATT-CI-001, `"timestamp": "2026-04-16T08:10:00+07:00"`
- **Expected Output**:
  - HTTP: `201 Created`
  - Body: `{ "success": true, "data": { "status": "late", ... } }`

---

### ATT-CI-003
- **Type**: e2e
- **Priority**: P0
- **Description**: Ngoài time window → 400, ghi fraud_log OUTSIDE_SCHEDULE_WINDOW
- **Precondition**: `checkin_time = 08:00`, `window = 15`; timestamp là `09:00 UTC+7`
- **Input**: Như ATT-CI-001, `"timestamp": "2026-04-16T09:00:00+07:00"`
- **Expected Output**:
  - HTTP: `400 Bad Request`
  - Body: `{ "success": false, "error": { "code": "OUTSIDE_SCHEDULE_WINDOW" } }`
  - DB: `fraud_logs` tạo record với `type = OUTSIDE_SCHEDULE_WINDOW`

---

### ATT-CI-004
- **Type**: e2e
- **Priority**: P0
- **Description**: WiFi BSSID sai → 400, ghi fraud_log WIFI_MISMATCH
- **Precondition**: Branch WiFi list không chứa `"FF:FF:FF:FF:FF:FF"`
- **Input**: Như ATT-CI-001, `"wifi_bssid": "FF:FF:FF:FF:FF:FF"`
- **Expected Output**:
  - HTTP: `400 Bad Request`
  - Body: `{ "success": false, "error": { "code": "WIFI_MISMATCH" } }`
  - DB: `fraud_logs` record với `type = WIFI_MISMATCH`

---

### ATT-CI-005
- **Type**: e2e
- **Priority**: P0
- **Description**: GPS ngoài geofence (distance > radius) → 400, ghi fraud_log OUTSIDE_GEOFENCE
- **Precondition**: Branch tại `(10.7769, 106.7009)`, `radius = 100m`; gửi GPS `(10.7900, 106.7200)` (~2km)
- **Input**: Như ATT-CI-001, `"latitude": 10.7900, "longitude": 106.7200`
- **Expected Output**:
  - HTTP: `400 Bad Request`
  - Body: `{ "success": false, "error": { "code": "OUTSIDE_GEOFENCE" } }`
  - DB: `fraud_logs` record với `type = OUTSIDE_GEOFENCE`

---

### ATT-CI-006
- **Type**: e2e
- **Priority**: P1
- **Description**: GPS accuracy > 50m → 400 GPS_ACCURACY_TOO_LOW
- **Precondition**: Như ATT-CI-001 nhưng `gps_accuracy = 75`
- **Input**: Như ATT-CI-001, `"gps_accuracy": 75`
- **Expected Output**:
  - HTTP: `400 Bad Request`
  - Body: `{ "success": false, "error": { "code": "GPS_ACCURACY_TOO_LOW" } }`

---

### ATT-CI-007
- **Type**: e2e
- **Priority**: P0
- **Description**: VPN active → 400, ghi fraud_log VPN_DETECTED
- **Precondition**: Như ATT-CI-001 nhưng `is_vpn_active = true`
- **Input**: Như ATT-CI-001, `"is_vpn_active": true`
- **Expected Output**:
  - HTTP: `400 Bad Request`
  - Body: `{ "success": false, "error": { "code": "VPN_DETECTED" } }`
  - DB: `fraud_logs` record với `type = VPN_DETECTED`

---

### ATT-CI-008
- **Type**: e2e
- **Priority**: P0
- **Description**: Mock location → 400, ghi fraud_log MOCK_LOCATION
- **Precondition**: Như ATT-CI-001 nhưng `is_mock_location = true`
- **Input**: Như ATT-CI-001, `"is_mock_location": true`
- **Expected Output**:
  - HTTP: `400 Bad Request`
  - Body: `{ "success": false, "error": { "code": "MOCK_LOCATION_DETECTED" } }`
  - DB: `fraud_logs` record với `type = MOCK_LOCATION`

---

### ATT-CI-009
- **Type**: e2e
- **Priority**: P0
- **Description**: Device ID sai (không khớp registered) → 401, ghi fraud_log DEVICE_MISMATCH
- **Precondition**: `employee.registered_device_id = "correct-device"`; gửi `device_id = "wrong-device"`
- **Input**: Như ATT-CI-001, `"device_id": "wrong-device-uuid"`
- **Expected Output**:
  - HTTP: `401 Unauthorized`
  - Body: `{ "success": false, "error": { "code": "DEVICE_MISMATCH" } }`
  - DB: `fraud_logs` record với `type = DEVICE_MISMATCH`

---

### ATT-CI-010
- **Type**: e2e
- **Priority**: P1
- **Description**: last_unlock_elapsed_minutes > 90 → 400, ghi fraud_log (device farming suspected)
- **Precondition**: Request chứa field `last_unlock_elapsed_minutes = 120` (thiết bị unlock > 90 phút không ai dùng)
- **Input**: Như ATT-CI-001, thêm `"last_unlock_elapsed_minutes": 120`
- **Expected Output**:
  - HTTP: `400 Bad Request`
  - Body: `{ "success": false, "error": { "code": "DEVICE_FARMING_SUSPECTED" } }`
  - DB: `fraud_logs` record với `type = DEVICE_FARMING`

---

### ATT-CI-011
- **Type**: e2e
- **Priority**: P0
- **Description**: Checkin lần 3 trong ngày (rate limit 2/ngày) → 429, ghi fraud_log RATE_LIMIT_EXCEEDED
- **Precondition**: Employee đã có 2 attendance records `check_in` hôm nay trong DB
- **Input**: Như ATT-CI-001
- **Expected Output**:
  - HTTP: `429 Too Many Requests`
  - Body: `{ "success": false, "error": { "code": "RATE_LIMIT_EXCEEDED", "message": "Vượt quá giới hạn 2 lần checkin/ngày." } }`
  - DB: `fraud_logs` record với `type = RATE_LIMIT_EXCEEDED`

---

### ATT-CI-012
- **Type**: e2e
- **Priority**: P0
- **Description**: Checkin thành công → publish Redis event "attendance:checkin" với đúng payload
- **Precondition**: Như ATT-CI-001
- **Input**: Như ATT-CI-001
- **Expected Output**:
  - HTTP: `201 Created`
  - Redis pub/sub: channel `attendance:checkin`, payload:
    ```json
    {
      "employee_id": "<uuid>",
      "employee_name": "Nguyen Van A",
      "branch_id": "<uuid>",
      "status": "on_time",
      "check_in_time": "2026-04-16T08:02:30+07:00"
    }
    ```

---

## Module 6: Attendance — Auto Check-out

### ATT-CO-001
- **Type**: e2e
- **Priority**: P0
- **Description**: Checkout thành công → 201, work_duration_minutes tính đúng
- **Precondition**: Employee đã checkin lúc `08:00`; bây giờ là `17:32`; điều kiện WiFi/GPS/device hợp lệ
- **Input**:
  ```json
  POST /api/v1/attendance/auto-checkout
  Headers: Authorization: Bearer <employee_token>
  {
    "employee_id": "<uuid>",
    "wifi_bssid": "AA:BB:CC:DD:EE:FF",
    "latitude": 10.7769,
    "longitude": 106.7009,
    "gps_accuracy": 10.0,
    "device_id": "registered-device-uuid",
    "timestamp": "2026-04-16T17:32:00+07:00",
    "is_vpn_active": false,
    "is_mock_location": false
  }
  ```
- **Expected Output**:
  - HTTP: `201 Created`
  - Body:
    ```json
    {
      "success": true,
      "data": {
        "check_out_time": "2026-04-16T17:32:00+07:00",
        "work_duration_minutes": 572,
        "work_date": "2026-04-16"
      }
    }
    ```
- **Notes**: `work_duration_minutes = (17:32 - 08:00) = 572 phút`

---

### ATT-CO-002
- **Type**: e2e
- **Priority**: P0
- **Description**: Checkout khi chưa checkin → 400
- **Precondition**: Employee không có attendance record check_in hôm nay
- **Input**: Như ATT-CO-001
- **Expected Output**:
  - HTTP: `400 Bad Request`
  - Body: `{ "success": false, "error": { "code": "NO_CHECKIN_FOUND", "message": "Bạn chưa check-in hôm nay." } }`

---

### ATT-CO-003
- **Type**: e2e
- **Priority**: P1
- **Description**: Checkout ngoài giờ quy định → 400
- **Precondition**: `checkout_time = 17:30`, `window = 15`; gửi request lúc `20:00`
- **Input**: Như ATT-CO-001, `"timestamp": "2026-04-16T20:00:00+07:00"`
- **Expected Output**:
  - HTTP: `400 Bad Request`
  - Body: `{ "success": false, "error": { "code": "OUTSIDE_CHECKOUT_WINDOW" } }`

---

## Module 7: Attendance — Manual

### ATT-MAN-001
- **Type**: e2e
- **Priority**: P1
- **Description**: Manual checkin có note → 201, status: late
- **Precondition**: Employee trong range WiFi + GPS; thời gian sau window → phải manual với note
- **Input**:
  ```json
  POST /api/v1/attendance/manual
  Headers: Authorization: Bearer <employee_token>
  {
    "employee_id": "<uuid>",
    "wifi_bssid": "AA:BB:CC:DD:EE:FF",
    "latitude": 10.7769,
    "longitude": 106.7009,
    "gps_accuracy": 15.0,
    "device_id": "registered-device-uuid",
    "timestamp": "2026-04-16T09:30:00+07:00",
    "is_vpn_active": false,
    "is_mock_location": false,
    "note": "Xe bị hư dọc đường, trễ hơn bình thường"
  }
  ```
- **Expected Output**:
  - HTTP: `201 Created`
  - Body: `{ "success": true, "data": { "status": "late", "type": "manual", ... } }`

---

### ATT-MAN-002
- **Type**: e2e
- **Priority**: P1
- **Description**: Manual checkin không có note → 400 validation error
- **Precondition**: Như ATT-MAN-001 nhưng thiếu `note`
- **Input**: Như ATT-MAN-001, không có field `note`
- **Expected Output**:
  - HTTP: `400 Bad Request`
  - Body: `{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "note là bắt buộc với manual check-in." } }`

---

### ATT-MAN-003
- **Type**: e2e
- **Priority**: P1
- **Description**: Manual checkin ngoài WiFi/GPS vẫn bị từ chối → 400
- **Precondition**: WiFi BSSID sai + GPS ngoài geofence
- **Input**: Như ATT-MAN-001, `"wifi_bssid": "00:00:00:00:00:00", "latitude": 10.9999`
- **Expected Output**:
  - HTTP: `400 Bad Request`
  - Body: `{ "success": false, "error": { "code": "WIFI_MISMATCH" } }` (fail-fast ở điều kiện đầu tiên)

---

## Module 8: Attendance — List & Stats

### ATT-LIST-001
- **Type**: e2e
- **Priority**: P0
- **Description**: Employee chỉ xem được attendance của chính mình
- **Precondition**: EMP001 và EMP002 đều có attendance records
- **Input**:
  ```
  GET /api/v1/attendance?employee_id={emp002_id}
  Headers: Authorization: Bearer <emp001_token>
  ```
- **Expected Output**:
  - HTTP: `403 Forbidden`
  - Body: `{ "success": false, "error": { "code": "FORBIDDEN" } }`

---

### ATT-LIST-002
- **Type**: e2e
- **Priority**: P0
- **Description**: branch_manager xem được branch mình, xem branch khác → 403
- **Precondition**: `manager-A` quản lý `branch-A`; request query `branch_id = branch-B`
- **Input**:
  ```
  GET /api/v1/attendance?branch_id={branch_b_id}
  Headers: Authorization: Bearer <manager_a_token>
  ```
- **Expected Output**: HTTP `403 Forbidden`

---

### ATT-LIST-003
- **Type**: e2e
- **Priority**: P1
- **Description**: HR xem được attendance mọi branch
- **Precondition**: HR với role `hr`; attendance records từ nhiều branch
- **Input**:
  ```
  GET /api/v1/attendance?branch_id={any_branch_id}
  Headers: Authorization: Bearer <hr_token>
  ```
- **Expected Output**: HTTP `200 OK`

---

### ATT-LIST-004
- **Type**: e2e
- **Priority**: P1
- **Description**: Filter attendance theo date range, status, branch_id
- **Precondition**: Records tồn tại với nhiều status và ngày khác nhau
- **Input**:
  ```
  GET /api/v1/attendance?branch_id={b}&date_from=2026-04-01&date_to=2026-04-15&status=late&page=1&limit=20
  Headers: Authorization: Bearer <hr_token>
  ```
- **Expected Output**:
  - HTTP: `200 OK`
  - Body: chỉ chứa records `status = late` trong khoảng ngày chỉ định
  - `total` đúng với số records trong filter

---

### ATT-LIST-005
- **Type**: e2e
- **Priority**: P1
- **Description**: Export CSV — trả Content-Type: text/csv, đủ columns, max 31 ngày
- **Precondition**: HR; records tồn tại
- **Input**:
  ```
  GET /api/v1/attendance/export?branch_id={b}&date_from=2026-04-01&date_to=2026-04-30
  Headers: Authorization: Bearer <hr_token>
  ```
- **Expected Output**:
  - HTTP: `200 OK`
  - Header: `Content-Type: text/csv`
  - Header: `Content-Disposition: attachment; filename="attendance_...csv"`
  - Body (CSV columns): `employee_code,full_name,branch_name,work_date,check_in,check_out,status,note`

---

### ATT-LIST-006
- **Type**: e2e
- **Priority**: P1
- **Description**: Export CSV quá 31 ngày → 400
- **Precondition**: HR
- **Input**:
  ```
  GET /api/v1/attendance/export?branch_id={b}&date_from=2026-01-01&date_to=2026-04-30
  Headers: Authorization: Bearer <hr_token>
  ```
- **Expected Output**:
  - HTTP: `400 Bad Request`
  - Body: `{ "success": false, "error": { "code": "DATE_RANGE_TOO_LARGE", "message": "Tối đa 31 ngày mỗi lần export." } }`

---

## Module 9: Fraud

### FRAUD-001
- **Type**: e2e
- **Priority**: P1
- **Description**: branch_manager chỉ thấy fraud logs của branch mình
- **Precondition**: Fraud logs tồn tại từ nhiều branch
- **Input**:
  ```
  GET /api/v1/fraud/logs?branch_id={branch_b_id}
  Headers: Authorization: Bearer <manager_a_token>
  ```
- **Expected Output**:
  - HTTP: `403 Forbidden`

---

### FRAUD-002
- **Type**: e2e
- **Priority**: P1
- **Description**: HR / super_admin resolve fraud log → resolved_at, resolved_by được set
- **Precondition**: Fraud log tồn tại với `resolved_at = null`
- **Input**:
  ```json
  PATCH /api/v1/fraud/logs/{fraud_log_id}/resolve
  Headers: Authorization: Bearer <hr_token>
  {
    "resolution_note": "Đã xác minh, nhân viên đang đổi thiết bị được phê duyệt."
  }
  ```
- **Expected Output**:
  - HTTP: `200 OK`
  - DB: `fraud_logs.resolved_at = NOW()`, `resolved_by = hr_id`

---

### FRAUD-003
- **Type**: e2e
- **Priority**: P0
- **Description**: Employee cố resolve fraud log → 403 Forbidden
- **Precondition**: Fraud log tồn tại
- **Input**:
  ```json
  PATCH /api/v1/fraud/logs/{fraud_log_id}/resolve
  Headers: Authorization: Bearer <employee_token>
  { "resolution_note": "..." }
  ```
- **Expected Output**: HTTP `403 Forbidden`

---

## Module 10: Sync — Offline Queue

### SYNC-001
- **Type**: e2e
- **Priority**: P0
- **Description**: Batch sync 3 records hợp lệ → 3 success
- **Precondition**: Records trong vòng 24h, điều kiện fraud pass
- **Input**:
  ```json
  POST /api/v1/sync/batch
  Headers: Authorization: Bearer <employee_token>
  {
    "records": [
      {
        "idempotency_key": "key-001",
        "type": "check_in",
        "wifi_bssid": "AA:BB:CC:DD:EE:FF",
        "latitude": 10.7769,
        "longitude": 106.7009,
        "gps_accuracy": 12.0,
        "device_id": "registered-device",
        "timestamp": "2026-04-16T08:02:00+07:00",
        "is_vpn_active": false,
        "is_mock_location": false
      },
      { "idempotency_key": "key-002", ... },
      { "idempotency_key": "key-003", ... }
    ]
  }
  ```
- **Expected Output**:
  - HTTP: `200 OK`
  - Body:
    ```json
    {
      "success": true,
      "data": {
        "results": [
          { "idempotency_key": "key-001", "status": "success" },
          { "idempotency_key": "key-002", "status": "success" },
          { "idempotency_key": "key-003", "status": "success" }
        ]
      }
    }
    ```

---

### SYNC-002
- **Type**: e2e
- **Priority**: P1
- **Description**: Batch sync có record duplicate (cùng employee + type + work_date) → status: duplicate, không tạo record mới
- **Precondition**: Attendance record `(EMP001, check_in, 2026-04-16)` đã tồn tại
- **Input**: Batch chứa record với cùng `employee_id + type + work_date`
- **Expected Output**:
  - HTTP: `200 OK`
  - Record đó: `{ "status": "duplicate", "message": "Record đã tồn tại." }`
  - DB: không tạo thêm attendance record

---

### SYNC-003
- **Type**: e2e
- **Priority**: P1
- **Description**: Batch sync record quá cũ (> 24h) → status: failed, RECORD_TOO_OLD
- **Precondition**: Record có `timestamp` cách hiện tại > 24h
- **Input**: Record với `timestamp = "2026-04-14T08:00:00+07:00"` (2 ngày trước)
- **Expected Output**:
  - Record đó: `{ "status": "failed", "error": { "code": "RECORD_TOO_OLD" } }`

---

### SYNC-004
- **Type**: e2e
- **Priority**: P0
- **Description**: Batch sync record có fraud → status: failed, FRAUD_REJECTED
- **Precondition**: Record có `is_vpn_active = true`
- **Input**: Record với `"is_vpn_active": true`
- **Expected Output**:
  - Record đó: `{ "status": "failed", "error": { "code": "FRAUD_REJECTED" } }`
  - DB: `fraud_logs` tạo record

---

### SYNC-005
- **Type**: e2e
- **Priority**: P0
- **Description**: Idempotency — gửi cùng idempotency_key 2 lần → chỉ tạo 1 attendance record
- **Precondition**: Lần 1 đã sync thành công với `idempotency_key = "idem-key-xyz"`
- **Input (lần 2)**: Cùng payload với `"idempotency_key": "idem-key-xyz"`
- **Expected Output (lần 2)**:
  - HTTP: `200 OK`
  - Record: `{ "status": "duplicate", "message": "Idempotency key đã xử lý." }`
  - DB: vẫn chỉ có 1 attendance record

---

### SYNC-006
- **Type**: e2e
- **Priority**: P1
- **Description**: Batch sync > 50 records → 400 over limit
- **Precondition**: Gửi array `records` có 51 phần tử
- **Input**: `{ "records": [ /* 51 items */ ] }`
- **Expected Output**:
  - HTTP: `400 Bad Request`
  - Body: `{ "success": false, "error": { "code": "BATCH_LIMIT_EXCEEDED", "message": "Tối đa 50 records mỗi batch." } }`

---

### SYNC-007
- **Type**: e2e
- **Priority**: P1
- **Description**: GET /sync/status → trả pending_count đúng
- **Precondition**: Employee có 5 records trong queue với `status = pending`
- **Input**:
  ```
  GET /api/v1/sync/status
  Headers: Authorization: Bearer <employee_token>
  ```
- **Expected Output**:
  - HTTP: `200 OK`
  - Body:
    ```json
    {
      "success": true,
      "data": {
        "pending_count": 5,
        "last_sync_at": "<timestamp>"
      }
    }
    ```

---

## Module 11: WebSocket

### WS-001
- **Type**: integration
- **Priority**: P0
- **Description**: Connect với valid token → join đúng room
- **Precondition**: `branch_manager` của `branch-A` có valid access_token
- **Input**: WebSocket connect với `{ "token": "<branch_manager_token>" }`
- **Expected Output**:
  - Connection established
  - Server tự động join client vào room `branch:{branch_a_id}`
  - Server emit event `connected` với `{ "room": "branch:{branch_a_id}" }`

---

### WS-002
- **Type**: integration
- **Priority**: P0
- **Description**: Connect với invalid/expired token → server ngắt kết nối ngay
- **Precondition**: Token không hợp lệ
- **Input**: WebSocket connect với `{ "token": "invalid.jwt.token" }`
- **Expected Output**:
  - Server emit event `error` với `{ "code": "UNAUTHORIZED" }`
  - Connection bị disconnect ngay lập tức

---

### WS-003
- **Type**: integration
- **Priority**: P0
- **Description**: Sau khi checkin thành công → room nhận event "attendance:checkin" đúng payload
- **Precondition**: Client A (branch_manager) đang kết nối room `branch:{branch_id}`; Employee B thuộc branch đó thực hiện checkin
- **Input**: Employee B gọi `POST /api/v1/attendance/auto-checkin`
- **Expected Output**:
  - Client A (đang lắng nghe room) nhận event `attendance:checkin`:
    ```json
    {
      "event": "attendance:checkin",
      "data": {
        "employee_id": "<uuid>",
        "employee_name": "Nguyen Van A",
        "branch_id": "<uuid>",
        "status": "on_time",
        "check_in_time": "2026-04-16T08:02:30+07:00"
      }
    }
    ```

---

### WS-004
- **Type**: integration
- **Priority**: P1
- **Description**: Fraud detected → room nhận event "fraud:detected"
- **Precondition**: Employee thực hiện checkin với VPN, bị từ chối
- **Input**: `POST /api/v1/attendance/auto-checkin` với `is_vpn_active = true`
- **Expected Output**:
  - Room `branch:{branch_id}` nhận event `fraud:detected`:
    ```json
    {
      "event": "fraud:detected",
      "data": {
        "employee_id": "<uuid>",
        "fraud_type": "VPN_DETECTED",
        "timestamp": "..."
      }
    }
    ```

---

### WS-005
- **Type**: integration
- **Priority**: P2
- **Description**: Stats update mỗi 30 giây → global room nhận event "stats:update"
- **Precondition**: super_admin connected vào room `global`
- **Input**: Cron job 30s chạy
- **Expected Output**:
  - Room `global` nhận event `stats:update` với payload:
    ```json
    {
      "event": "stats:update",
      "data": {
        "total_checkin_today": 1250,
        "total_late_today": 45,
        "total_absent_today": 20,
        "updated_at": "<timestamp>"
      }
    }
    ```
- **Notes**: Test dùng `jest.useFakeTimers()` để advance time 30s

---

## Module 12: Device Session Guard

### DEV-SESS-001
- **Type**: unit
- **Priority**: P0
- **Description**: Mọi attendance request đều đi qua DeviceSessionGuard
- **Precondition**: DeviceSessionGuard được apply ở `AttendanceController`
- **Input**: Bất kỳ request nào đến `/api/v1/attendance/*`
- **Expected Output**: Guard được gọi, kiểm tra JWT `deviceId` vs `employee.registeredDeviceId`
- **Notes**: Kiểm tra bằng unit test, mock `canActivate` và verify nó được gọi

---

### DEV-SESS-002
- **Type**: unit
- **Priority**: P0
- **Description**: JWT.deviceId != employee.registeredDeviceId → 401 DEVICE_SESSION_INVALID
- **Precondition**: JWT chứa `deviceId = "device-A"`; `employee.registered_device_id = "device-B"`
- **Input**: Request với valid JWT nhưng device không khớp
- **Expected Output**:
  - Guard throw `UnauthorizedException`
  - HTTP: `401 Unauthorized`
  - Body: `{ "success": false, "error": { "code": "DEVICE_SESSION_INVALID" } }`

---

### DEV-SESS-003
- **Type**: e2e
- **Priority**: P0
- **Description**: Admin reset device → request tiếp theo của employee bị từ chối ngay (Redis invalidated)
- **Precondition**: Employee đang có valid session; admin thực hiện reset device
- **Input (step 1)**: `POST /api/v1/employees/{emp_id}/reset-device` (admin)
- **Input (step 2)**: `POST /api/v1/attendance/auto-checkin` (employee, dùng token cũ)
- **Expected Output (step 2)**:
  - HTTP: `401 Unauthorized`
  - Body: `{ "success": false, "error": { "code": "DEVICE_SESSION_INVALID" } }`
- **Notes**: Kiểm tra Redis cache invalidation xảy ra ngay sau step 1 (không delay)

---

## Module 13: Timezone

### TZ-001
- **Type**: unit
- **Priority**: P0
- **Description**: Checkin lúc 00:30 UTC (= 07:30 UTC+7) → work_date = ngày D (không phải D-1)
- **Precondition**: Timestamp UTC `2026-04-16T00:30:00Z` = `2026-04-16T07:30:00+07:00`
- **Input**:
  ```typescript
  toVietnamDate("2026-04-16T00:30:00Z")
  ```
- **Expected Output**: `"2026-04-16"` (không phải `"2026-04-15"`)
- **Notes**: Lỗi timezone làm work_date sai ngày là critical bug

---

### TZ-002
- **Type**: unit
- **Priority**: P0
- **Description**: toVietnamDate() với thời điểm giáp ranh 00:00 UTC (= 07:00 UTC+7)
- **Input**:
  ```typescript
  toVietnamDate("2026-04-16T00:00:00Z")
  ```
- **Expected Output**: `"2026-04-16"`

---

### TZ-003
- **Type**: unit
- **Priority**: P0
- **Description**: toVietnamDate() với thời điểm 23:59 UTC ngày D-1 (= 06:59 UTC+7 ngày D)
- **Input**:
  ```typescript
  toVietnamDate("2026-04-15T23:59:00Z")
  ```
- **Expected Output**: `"2026-04-16"` (vì 23:59 UTC + 7h = 06:59 ngày 16)
- **Notes**: Đây là edge case quan trọng nhất của timezone

---

### TZ-004
- **Type**: unit
- **Priority**: P1
- **Description**: toVietnamDate() với thời điểm 16:59 UTC ngày D (= 23:59 UTC+7 ngày D)
- **Input**:
  ```typescript
  toVietnamDate("2026-04-16T16:59:00Z")
  ```
- **Expected Output**: `"2026-04-16"`

---

### TZ-005
- **Type**: unit
- **Priority**: P1
- **Description**: toVietnamDate() với thời điểm 17:00 UTC ngày D (= 00:00 UTC+7 ngày D+1)
- **Input**:
  ```typescript
  toVietnamDate("2026-04-16T17:00:00Z")
  ```
- **Expected Output**: `"2026-04-17"`

---

## Module 14: Partition

### PART-001
- **Type**: integration
- **Priority**: P1
- **Description**: Insert record vào tháng có partition → thành công
- **Precondition**: Partition `attendance_records_2026_04` đã được tạo trước
- **Input**:
  ```sql
  INSERT INTO attendance_records (..., check_in) VALUES (..., '2026-04-16T08:00:00+07:00')
  ```
- **Expected Output**: Insert thành công, record nằm trong partition đúng

---

### PART-002
- **Type**: integration
- **Priority**: P0
- **Description**: Insert record vào tháng chưa có partition → fail (partition không tồn tại)
- **Precondition**: Partition `attendance_records_2026_05` chưa được tạo
- **Input**:
  ```sql
  INSERT INTO attendance_records (..., check_in) VALUES (..., '2026-05-01T08:00:00+07:00')
  ```
- **Expected Output**: PostgreSQL error `no partition of relation found for row`
- **Notes**: Test này verify rằng cron job tạo partition cần chạy trước ngày đầu tháng; nếu không sẽ có outage

---

### PART-003
- **Type**: integration
- **Priority**: P1
- **Description**: Cron job tạo partition tháng kế tiếp chạy đúng vào ngày 25 mỗi tháng
- **Precondition**: Ngày 25 tháng hiện tại; partition tháng sau chưa tồn tại
- **Input**: Cron job `0 2 25 * *` trigger
- **Expected Output**: Partition `attendance_records_{year}_{month+1}` được tạo thành công trong PostgreSQL

---

---

## Coverage Summary

| Module | Số Test Cases | Unit | E2E | Integration | P0 | P1 | P2 |
|---|---|---|---|---|---|---|---|
| Auth | 18 | 0 | 18 | 0 | 9 | 8 | 1 |
| Branch | 8 | 0 | 8 | 0 | 3 | 4 | 1 |
| Schedule | 4 | 0 | 4 | 0 | 1 | 3 | 0 |
| Employee | 5 | 0 | 5 | 0 | 2 | 3 | 0 |
| Attendance — Check-in | 12 | 0 | 12 | 0 | 8 | 4 | 0 |
| Attendance — Check-out | 3 | 0 | 3 | 0 | 1 | 1 | 1 |
| Attendance — Manual | 3 | 0 | 3 | 0 | 0 | 3 | 0 |
| Attendance — List/Stats | 6 | 0 | 6 | 0 | 2 | 4 | 0 |
| Fraud | 3 | 0 | 3 | 0 | 1 | 2 | 0 |
| Sync — Offline Queue | 7 | 0 | 7 | 0 | 3 | 3 | 1 |
| WebSocket | 5 | 0 | 0 | 5 | 2 | 2 | 1 |
| Device Session Guard | 3 | 1 | 2 | 0 | 3 | 0 | 0 |
| Timezone | 5 | 5 | 0 | 0 | 3 | 2 | 0 |
| Partition | 3 | 0 | 0 | 3 | 1 | 2 | 0 |
| **TOTAL** | **85** | **6** | **71** | **8** | **39** | **41** | **5** |

### Target Coverage

| Layer | Target | Tool |
|---|---|---|
| Services (unit) | >= 80% | Jest + ts-jest |
| Controllers (e2e) | >= 60% | Jest + Supertest |
| Critical paths (P0) | 100% must pass | CI/CD gate |

### Test File Mapping

```
backend/test/
├── unit/
│   ├── auth.service.spec.ts            → AUTH-*
│   ├── branch.service.spec.ts          → BRANCH-*
│   ├── attendance.service.spec.ts      → ATT-CI-*, ATT-CO-*, ATT-MAN-*
│   ├── fraud-detection.service.spec.ts → FRAUD-*
│   ├── sync.service.spec.ts            → SYNC-*
│   ├── device-session.guard.spec.ts    → DEV-SESS-001, DEV-SESS-002
│   ├── timezone.util.spec.ts           → TZ-*
│   └── haversine.util.spec.ts          → GPS calculations
│
└── e2e/
    ├── auth.e2e-spec.ts                → AUTH-001 → AUTH-018
    ├── branch.e2e-spec.ts              → BRANCH-001 → BRANCH-008
    ├── schedule.e2e-spec.ts            → SCHEDULE-001 → SCHEDULE-004
    ├── employee.e2e-spec.ts            → EMP-001 → EMP-005
    ├── auto-checkin.e2e-spec.ts        → ATT-CI-001 → ATT-CI-012
    ├── auto-checkout.e2e-spec.ts       → ATT-CO-001 → ATT-CO-003
    ├── manual-checkin.e2e-spec.ts      → ATT-MAN-001 → ATT-MAN-003
    ├── attendance-list.e2e-spec.ts     → ATT-LIST-001 → ATT-LIST-006
    ├── fraud.e2e-spec.ts               → FRAUD-001 → FRAUD-003
    ├── sync.e2e-spec.ts                → SYNC-001 → SYNC-007
    ├── websocket.e2e-spec.ts           → WS-001 → WS-005
    ├── device-session.e2e-spec.ts      → DEV-SESS-003
    └── partition.integration-spec.ts   → PART-001 → PART-003
```

---

*Được tạo tự động bởi Senior Architect — eCheckAI V2*
*Tuân thủ AUDIT LOOP RULE: fix code, không fix test*
