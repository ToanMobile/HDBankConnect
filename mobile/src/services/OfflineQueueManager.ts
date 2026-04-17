import AsyncStorage from '@react-native-async-storage/async-storage';
import { AutoCheckinPayload, postBatchSync } from '../api/attendanceApi';

export type QueueEventType = 'auto_checkin' | 'auto_checkout' | 'manual_checkin';

export interface QueueItem {
  idempotency_key: string;
  event_type: QueueEventType;
  payload: AutoCheckinPayload;
  client_timestamp: string;
  retries: number;
  created_at: string;
}

const QUEUE_KEY = 'sa:offline_queue';
const MAX_RETRIES = 5;

export async function loadQueue(): Promise<QueueItem[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? (JSON.parse(raw) as QueueItem[]) : [];
}

export async function saveQueue(queue: QueueItem[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueue(item: QueueItem): Promise<void> {
  const queue = await loadQueue();
  // Dedup by idempotency_key
  if (queue.some((q) => q.idempotency_key === item.idempotency_key)) return;
  queue.push(item);
  await saveQueue(queue);
}

export async function flush(employeeId: string): Promise<{
  processed: number;
  failed: number;
  remaining: number;
}> {
  const queue = await loadQueue();
  if (queue.length === 0) return { processed: 0, failed: 0, remaining: 0 };

  try {
    const result = await postBatchSync(
      employeeId,
      queue.map((q) => ({
        event_type: q.event_type,
        payload: q.payload,
        client_timestamp: q.client_timestamp,
        idempotency_key: q.idempotency_key,
      })),
    );
    // On any success, remove processed items; keep failed for next flush
    // Server returns aggregated counts, per-item result would come from results[]
    // For simplicity: clear queue on success, keep on failure
    if (result.failed === 0) {
      await saveQueue([]);
      return { processed: result.processed, failed: 0, remaining: 0 };
    }
    // Partial failure: increment retry count
    const updated = queue.map((q) => ({ ...q, retries: q.retries + 1 }));
    const survived = updated.filter((q) => q.retries < MAX_RETRIES);
    await saveQueue(survived);
    return {
      processed: result.processed,
      failed: result.failed,
      remaining: survived.length,
    };
  } catch {
    // Entire network call failed — increment retries, keep queue
    const updated = queue.map((q) => ({ ...q, retries: q.retries + 1 }));
    const survived = updated.filter((q) => q.retries < MAX_RETRIES);
    await saveQueue(survived);
    return { processed: 0, failed: queue.length, remaining: survived.length };
  }
}
