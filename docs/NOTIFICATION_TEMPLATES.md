# NOTIFICATION_TEMPLATES.md — eCheckAI V2

> Hai kênh: **Local Notification** (mobile, hiển thị cho nhân viên) và **Bot Notification** (Telegram/Zalo, gửi cho quản lý).  
> Mọi thông báo phải rõ ràng: ai, làm gì, lúc nào, ở đâu.

---

## 1. Local Notification (Mobile — Nhân viên)

Dùng `react-native-push-notification` hoặc `expo-notifications`.  
Chỉ hiển thị khi background task chạy xong. Không cần server push.

### 1.1 Check-in thành công — Đúng giờ

```
[Title]  ✅ Đã chấm công vào
[Body]   08:02 · CN Quận 1 · Đúng giờ
[Sound]  default
[Badge]  clear
```

### 1.2 Check-in thành công — Đi trễ

```
[Title]  ⚠️ Đã chấm công vào (Muộn)
[Body]   08:18 · CN Quận 1 · Trễ 18 phút
[Sound]  default
[Badge]  1
```

### 1.3 Check-out thành công

```
[Title]  ✅ Đã chấm công ra
[Body]   17:31 · CN Quận 1 · Làm 9g 13p
[Sound]  default
[Badge]  clear
```

### 1.4 Check-in thất bại — Sai WiFi

```
[Title]  ❌ Không thể chấm công
[Body]   Không tìm thấy WiFi chi nhánh. Vui lòng kết nối WiFi HDBank.
[Sound]  default
[Badge]  1
[Action] "Mở app" → HomeScreen
```

### 1.5 Check-in thất bại — Ngoài khu vực

```
[Title]  ❌ Không thể chấm công
[Body]   Vị trí GPS của bạn ngoài khu vực chi nhánh (cách ${distance}m).
[Sound]  default
[Badge]  1
```

### 1.6 Check-in thất bại — VPN / Mock Location

```
[Title]  ❌ Chấm công bị từ chối
[Body]   Phát hiện VPN hoặc vị trí giả. Tắt VPN/mock location và thử lại.
[Sound]  default
[Badge]  1
```

### 1.7 Check-in thất bại — Ngoài khung giờ

```
[Title]  ℹ️ Ngoài giờ chấm công
[Body]   Khung giờ check-in là 07:45–08:15. Hiện tại ${currentTime}.
[Sound]  none
[Badge]  clear
```

### 1.8 Chưa check-out — Nhắc nhở

```
[Title]  🔔 Nhắc check-out
[Body]   Bạn chưa chấm công ra hôm nay. Kiểm tra lại nếu đã về.
[Sound]  default
[Badge]  1
[Trigger] 18:00 mỗi ngày làm việc nếu chưa checkout
```

### 1.9 Lưu offline — Sẽ đồng bộ sau

```
[Title]  📶 Đã lưu, chờ kết nối
[Body]   Chấm công lúc 08:03 đã được lưu. Sẽ gửi khi có mạng.
[Sound]  none
[Badge]  clear
```

### 1.10 Đồng bộ offline thành công

```
[Title]  ✅ Đồng bộ thành công
[Body]   ${count} lượt chấm công đã được gửi lên hệ thống.
[Sound]  none
[Badge]  clear
```

---

## 2. Telegram Bot (Quản lý chi nhánh / HR / Super Admin)

### Setup

```typescript
// backend/src/modules/notification/telegram.adapter.ts
const TELEGRAM_API = 'https://api.telegram.org/bot{BOT_TOKEN}/sendMessage';

// .env
TELEGRAM_BOT_TOKEN=7123456789:AAFxxx...
TELEGRAM_CHAT_GLOBAL_HR=-100987654321   // group chat ID HR + super admin (từ env)
// ⚠️ Branch chat IDs KHÔNG lưu ở env — lưu trong branches.telegram_chat_id (DB)
// Khi send: đọc branch.telegramChatId, null = không gửi cho branch đó
```

```typescript
// Cách gửi message cho branch:
async sendToBranch(branchId: string, message: string): Promise<void> {
  const branch = await this.branchRepo.findOne({ where: { id: branchId } });
  if (!branch?.telegramChatId) return;  // branch chưa config Telegram
  await this.sendMessage(branch.telegramChatId, message);
}
```

### Routing

| Event | Gửi đến |
|---|---|
| Checkin / Checkout bình thường | Không gửi (noise giảm tập trung) |
| Check-in muộn > 30 phút | Branch group + HR group |
| Fraud detected (severity: high/critical) | Branch group + HR group + super admin |
| Fraud detected (severity: low/medium) | Branch group |
| Nhân viên vắng cả ngày | Branch group + HR group (gửi lúc 17:00) |
| Sync lỗi liên tiếp > 3 lần | Super admin |

### 2.1 Late Checkin (> 30 phút)

```
🕐 *NHÂN VIÊN ĐI MUỘN*

👤 Nguyễn Văn A (NV001)
🏢 CN Quận 1
⏰ Check-in: 08:47 (muộn 47 phút)
📍 Vị trí xác nhận ✅

[Xem chi tiết](https://dashboard.smartattendance.vn/attendance/{id})
```

**Format (MarkdownV2):**

```typescript
const message = `🕐 *NHÂN VIÊN ĐI MUỘN*\n\n` +
  `👤 ${employeeName} \\(${employeeCode}\\)\n` +
  `🏢 ${branchName}\n` +
  `⏰ Check\\-in: ${checkInTime} \\(muộn ${lateMinutes} phút\\)\n` +
  `📍 Vị trí xác nhận ✅\n\n` +
  `[Xem chi tiết](${dashboardUrl})`;
```

### 2.2 Fraud Detected — High/Critical

```
🚨 *CẢNH BÁO GIAN LẬN CHẤM CÔNG*

👤 Trần Thị B (NV042)
🏢 CN Bình Thạnh
⚠️ Loại vi phạm: VPN được phát hiện
🔴 Mức độ: CAO
🕐 Thời gian: 08:03 15/01/2025
🌐 IP: 185.220.x.x (ProtonVPN)

Hành động cần thiết: Xác minh và liên hệ nhân viên.
[Xem fraud log](https://dashboard.smartattendance.vn/fraud/{id})
```

### 2.3 Fraud Detected — Low/Medium

```
⚠️ *Phát hiện bất thường*

👤 Lê Văn C (NV015)
🏢 CN Gò Vấp
⚠️ Loại: GPS ngoài khu vực (cách 320m)
🟡 Mức độ: Trung bình
🕐 08:05 15/01/2025

[Xem chi tiết](https://dashboard.smartattendance.vn/fraud/{id})
```

### 2.4 Daily Absent Report (gửi lúc 17:00)

```
📊 *BÁO CÁO VẮNG MẶT — 15/01/2025*
🏢 CN Quận 1

❌ Vắng (không lý do):
  • Phạm Thị D (NV033)
  • Hoàng Văn E (NV078)

Total hôm nay: 23 đi làm / 25 nhân viên

[Xem đầy đủ](https://dashboard.smartattendance.vn/attendance?date=2025-01-15)
```

### 2.5 System Error Alert

```
🔴 *LỖI HỆ THỐNG*

⚙️ Sync queue lỗi liên tiếp 3 lần
📦 Employee: Nguyễn Văn A (NV001)
❌ Error: Network timeout after 3 retries
🕐 08:15 15/01/2025

Cần kiểm tra API server và kết nối mạng.
```

---

## 3. Zalo OA (Official Account — phương án dự phòng)

> Zalo OA dùng khi nhân viên không dùng Telegram. Nội dung tương tự nhưng format theo Zalo Message Template.

### Setup

```typescript
// backend/src/modules/notification/zalo.adapter.ts

// .env
ZALO_OA_ACCESS_TOKEN=xxx
ZALO_OA_SECRET_KEY=xxx
```

### Zalo Message Template — Check-in result (gửi cho nhân viên qua Zalo OA)

```json
{
  "recipient": { "user_id": "{zalo_user_id}" },
  "message": {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "transaction",
        "language": "VI",
        "elements": [
          {
            "title": "Xác nhận chấm công",
            "subtitle": "CN Quận 1 • 15/01/2025",
            "image_url": "https://cdn.smartattendance.vn/icons/checkin-success.png"
          }
        ],
        "buttons": [
          {
            "title": "Xem lịch sử",
            "type": "oa.open.url",
            "payload": { "url": "https://app.smartattendance.vn/history" }
          }
        ]
      }
    }
  }
}
```

---

## 4. NotificationAdapter Interface

```typescript
// backend/src/modules/notification/notification.adapter.ts
export interface NotificationAdapter {
  sendCheckinAlert(payload: CheckinAlertPayload): Promise<void>;
  sendFraudAlert(payload: FraudAlertPayload): Promise<void>;
  sendAbsentReport(payload: AbsentReportPayload): Promise<void>;
  sendSystemError(payload: SystemErrorPayload): Promise<void>;
}

export interface CheckinAlertPayload {
  employeeId:   string;
  employeeName: string;
  employeeCode: string;
  branchId:     string;
  branchName:   string;
  checkInTime:  string;
  lateMinutes:  number;
  status:       'on_time' | 'late';
}

export interface FraudAlertPayload {
  fraudLogId:   string;
  employeeId:   string;
  employeeName: string;
  employeeCode: string;
  branchId:     string;
  branchName:   string;
  fraudType:    FraudType;
  severity:     FraudSeverity;
  details:      Record<string, unknown>;
  occurredAt:   string;
}

export interface AbsentReportPayload {
  branchId:       string;
  branchName:     string;
  reportDate:     string;
  absentList:     Array<{ employeeName: string; employeeCode: string }>;
  totalPresent:   number;
  totalEmployees: number;
}
```

---

## 5. Notification Service

```typescript
// backend/src/modules/notification/notification.service.ts
@Injectable()
export class NotificationService {
  private adapters: NotificationAdapter[];

  constructor(
    private telegramAdapter: TelegramAdapter,
    private zaloAdapter: ZaloAdapter,
  ) {
    this.adapters = [telegramAdapter, zaloAdapter];
  }

  async sendFraudAlert(payload: FraudAlertPayload): Promise<void> {
    // Gửi song song, không throw nếu 1 adapter fail
    await Promise.allSettled(
      this.adapters.map((a) => a.sendFraudAlert(payload))
    );
  }
}
```

---

## 6. Trigger Points

| Event | Trigger location | Delay |
|---|---|---|
| Late checkin (> 30 phút) | `AttendanceService.processCheckin()` | Ngay lập tức |
| Fraud detected (mọi severity) | `FraudDetectionService.detect()` | Ngay lập tức |
| Absent report | `@Cron('0 17 * * 1-5')` — 17:00 T2-T6 | Batch |
| Sync error 3x | `SyncService.processBatch()` | Sau retry thứ 3 |
| Device reset | `AuthService.resetDevice()` | Ngay lập tức |
