# OFFLINE_SYNC_PROTOCOL.md — Smart Attendance V2

> Nhân viên chấm công dù mất mạng. App lưu vào SQLite queue, sync khi có kết nối.  
> Server xử lý batch với conflict detection, không duplicate record.

---

## 1. Overview

```
Mobile                          Server
  │                               │
  ├─ [Offline] ConditionChecker   │
  │   pass → save to SQLite       │
  │   queue (status: pending)     │
  │                               │
  ├─ [Online restored] ──────────►│
  │   POST /api/v1/sync/batch     │
  │   [array of pending records]  │
  │                               ├── Validate each record
  │                               ├── Deduplicate check
  │                               ├── Insert valid records
  │                               ├── Return results per item
  │ ◄──────────────────────────── │
  │   { results: [...] }          │
  │                               │
  ├─ Update SQLite:               │
  │   success → mark synced       │
  │   fail → increment retry      │
  │   dup → mark as duplicate     │
```

---

## 2. SQLite Queue Schema (Mobile)

```typescript
// mobile/src/db/queue.schema.ts
export interface SyncQueueItem {
  id:               string;   // UUID generated on device
  idempotency_key:  string;   // sha256(employeeId + type + workDate) — chống duplicate khi timeout
  type:             'auto_checkin' | 'auto_checkout' | 'manual';
  status:           'pending' | 'syncing' | 'synced' | 'failed' | 'duplicate';
  payload:          string;   // JSON string của AutoCheckinDto
  retry_count:      number;
  last_error:       string | null;
  created_at:       string;   // ISO 8601, thời điểm chấm công thực tế
  synced_at:        string | null;
}

// SQL (SQLite)
CREATE TABLE sync_queue (
  id               TEXT PRIMARY KEY,
  idempotency_key  TEXT UNIQUE NOT NULL,
  type             TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending',
  payload          TEXT NOT NULL,
  retry_count      INTEGER NOT NULL DEFAULT 0,
  last_error       TEXT,
  created_at       TEXT NOT NULL,
  synced_at        TEXT
);

CREATE INDEX idx_sync_queue_status ON sync_queue (status);
CREATE INDEX idx_sync_queue_created_at ON sync_queue (created_at);
```

---

## 3. Mobile: OfflineQueueManager

```typescript
// mobile/src/services/OfflineQueueManager.ts

export class OfflineQueueManager {
  private static MAX_RETRY = 3;
  private static SYNC_BATCH_SIZE = 20;

  // Lưu vào queue khi API call thất bại do network
  async enqueue(type: SyncQueueItem['type'], payload: AutoCheckinDto): Promise<void> {
    const item: SyncQueueItem = {
      id:          generateUUID(),
      type,
      status:      'pending',
      payload:     JSON.stringify(payload),
      retry_count: 0,
      last_error:  null,
      created_at:  new Date().toISOString(),
      synced_at:   null,
    };
    await db.execute(
      'INSERT INTO sync_queue VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [item.id, item.type, item.status, item.payload, 0, null, item.created_at, null]
    );
  }

  // Gọi khi network restored (NetInfo event)
  async syncPending(): Promise<SyncResult> {
    const pendingItems = await db.query<SyncQueueItem>(
      `SELECT * FROM sync_queue
       WHERE status IN ('pending', 'failed') AND retry_count < ?
       ORDER BY created_at ASC
       LIMIT ?`,
      [OfflineQueueManager.MAX_RETRY, OfflineQueueManager.SYNC_BATCH_SIZE]
    );

    if (pendingItems.length === 0) return { synced: 0, failed: 0 };

    // Mark as syncing
    const ids = pendingItems.map((i) => i.id);
    await db.execute(
      `UPDATE sync_queue SET status = 'syncing' WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );

    try {
      const response = await attendanceApi.batchSync({
        records: pendingItems.map((item) => ({
          queue_id: item.id,
          type:     item.type,
          ...JSON.parse(item.payload),
        })),
      });

      // Process results
      for (const result of response.results) {
        if (result.status === 'success') {
          await db.execute(
            `UPDATE sync_queue SET status = 'synced', synced_at = ? WHERE id = ?`,
            [new Date().toISOString(), result.queue_id]
          );
        } else if (result.status === 'duplicate') {
          await db.execute(
            `UPDATE sync_queue SET status = 'duplicate' WHERE id = ?`,
            [result.queue_id]
          );
        } else {
          await db.execute(
            `UPDATE sync_queue SET status = 'failed', retry_count = retry_count + 1, last_error = ? WHERE id = ?`,
            [result.error?.message ?? 'Unknown error', result.queue_id]
          );
        }
      }
    } catch (networkError) {
      // Network vẫn chưa ổn định, rollback về pending
      await db.execute(
        `UPDATE sync_queue SET status = 'pending' WHERE id IN (${ids.map(() => '?').join(',')})`,
        ids
      );
      throw networkError;
    }

    // Cleanup: xóa synced/duplicate records cũ hơn 7 ngày
    await this.cleanup();
  }

  private async cleanup(): Promise<void> {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await db.execute(
      `DELETE FROM sync_queue WHERE status IN ('synced', 'duplicate') AND synced_at < ?`,
      [cutoff]
    );
  }
}
```

---

## 4. Batch Sync API

### Request

```
POST /api/v1/sync/batch
Authorization: Bearer <access_token>
Content-Type: application/json
```

```typescript
interface BatchSyncRequest {
  records: Array<{
    queue_id:         string;   // UUID từ SQLite (dùng để match response)
    type:             'auto_checkin' | 'auto_checkout' | 'manual';
    employee_id:      string;
    wifi_bssid:       string;
    wifi_ssid:        string;
    latitude:         number;
    longitude:        number;
    gps_accuracy:     number;
    device_id:        string;
    device_model:     string;
    os_version:       string;
    app_version:      string;
    timestamp:        string;   // ISO 8601 — thời điểm thực tế trên device
    is_vpn_active:    boolean;
    is_mock_location: boolean;
  }>;
}
```

**Giới hạn:** tối đa 50 records / request.

### Response

```typescript
interface BatchSyncResponse {
  success:  boolean;
  data: {
    total:     number;
    synced:    number;
    failed:    number;
    duplicate: number;
    results:   Array<BatchSyncItemResult>;
  };
}

interface BatchSyncItemResult {
  queue_id:      string;
  status:        'success' | 'failed' | 'duplicate';
  attendance_id?: string;          // nếu success
  error?: {
    code:    string;
    message: string;
  };
}
```

**Example response:**

```json
{
  "success": true,
  "data": {
    "total": 3,
    "synced": 2,
    "failed": 0,
    "duplicate": 1,
    "results": [
      {
        "queue_id":      "local-uuid-1",
        "status":        "success",
        "attendance_id": "server-uuid-abc"
      },
      {
        "queue_id":      "local-uuid-2",
        "status":        "duplicate",
        "error": {
          "code":    "DUPLICATE_CHECKIN",
          "message": "Attendance record already exists for this employee on 2025-01-15"
        }
      },
      {
        "queue_id":      "local-uuid-3",
        "status":        "success",
        "attendance_id": "server-uuid-def"
      }
    ]
  }
}
```

---

## 5. Server: Deduplication Logic

```typescript
// backend/src/modules/sync/sync.service.ts

async processBatch(records: BatchSyncRequest['records'], employeeId: string): Promise<BatchSyncResponse['data']> {
  const results: BatchSyncItemResult[] = [];

  for (const record of records) {
    try {
      // Dedup check: cùng employee + cùng type + cùng work_date
      const workDate = toVietnamDate(record.timestamp); // "2025-01-15"
      const existing = await this.attendanceRepo.findOne({
        where: {
          employeeId,
          type:     record.type as AttendanceType,
          workDate,
        },
      });

      if (existing) {
        results.push({
          queue_id: record.queue_id,
          status:   'duplicate',
          error: {
            code:    'DUPLICATE_CHECKIN',
            message: `Attendance record already exists for ${workDate}`,
          },
        });
        continue;
      }

      // Timestamp validation: không chấp nhận record quá cũ (> 24h)
      const recordTime = new Date(record.timestamp);
      const ageHours = (Date.now() - recordTime.getTime()) / (1000 * 60 * 60);
      if (ageHours > 24) {
        results.push({
          queue_id: record.queue_id,
          status:   'failed',
          error: {
            code:    'RECORD_TOO_OLD',
            message: 'Offline records older than 24 hours are not accepted',
          },
        });
        continue;
      }

      // Chạy toàn bộ validation flow (fraud + condition)
      const attendanceId = await this.attendanceService.processCheckin(record, {
        skipRateLimit: false,   // vẫn enforce rate limit
        isOfflineSync: true,    // flag để log đặc biệt
      });

      results.push({
        queue_id:      record.queue_id,
        status:        'success',
        attendance_id: attendanceId,
      });

    } catch (err) {
      results.push({
        queue_id: record.queue_id,
        status:   'failed',
        error: {
          code:    err.code ?? 'PROCESSING_ERROR',
          message: err.message,
        },
      });
    }
  }

  return {
    total:     records.length,
    synced:    results.filter((r) => r.status === 'success').length,
    failed:    results.filter((r) => r.status === 'failed').length,
    duplicate: results.filter((r) => r.status === 'duplicate').length,
    results,
  };
}
```

---

## 6. Sync Status API

```
GET /api/v1/sync/status
Authorization: Bearer <access_token>
```

```json
{
  "success": true,
  "data": {
    "pending_count":   2,
    "last_synced_at": "2025-01-15T08:05:00+07:00",
    "oldest_pending":  "2025-01-15T07:58:30+07:00"
  }
}
```

---

## 7. Network Detection (Mobile)

```typescript
// mobile/src/services/OfflineQueueManager.ts
import NetInfo from '@react-native-community/netinfo';

NetInfo.addEventListener((state) => {
  if (state.isConnected && state.isInternetReachable) {
    offlineQueueManager.syncPending().catch(console.error);
  }
});
```

---

## 8. Retry Strategy

| Retry | Delay | Action |
|---|---|---|
| 1st | Ngay khi network restored | Auto |
| 2nd | +5 phút | Auto |
| 3rd | +30 phút | Auto |
| > 3rd | — | Mark `failed`, không retry nữa |

Records ở trạng thái `failed` với `retry_count >= 3`:
- Hiển thị warning trong HomeScreen ("X lượt chấm công không thể đồng bộ")
- Nhân viên có thể bấm "Thử lại thủ công" để reset `retry_count` và `status = pending`

---

## 9. Conflict Rules

| Tình huống | Xử lý |
|---|---|
| Cùng employee, cùng ngày, cùng loại (checkin/checkout) | `DUPLICATE` — bỏ qua, không tạo record mới |
| Cùng employee, cùng ngày, khác loại (checkin + checkout) | Cho phép — 2 records khác nhau |
| Timestamp quá cũ (> 24h) | `RECORD_TOO_OLD` — từ chối |
| Fraud detected trong offline record | `FRAUD_REJECTED` — ghi fraud_log, không tạo attendance |
| WiFi/GPS không pass | `CONDITION_FAILED` — ghi lý do vào error |
