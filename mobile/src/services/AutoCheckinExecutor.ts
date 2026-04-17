import { runConditionChecks, BranchConfig } from './ConditionChecker';
import {
  postAutoCheckin,
  postAutoCheckout,
  AutoCheckinPayload,
} from '../api/attendanceApi';
import { enqueue } from './OfflineQueueManager';
import { computeIdempotencyKey } from '../utils/idempotencyKey';

export type CheckinKind = 'auto_checkin' | 'auto_checkout';

export interface ExecuteResult {
  kind: CheckinKind;
  success: boolean;
  reason?: string;
  branchName?: string;
  queued?: boolean;
}

function toWorkDate(iso: string): string {
  // sv-SE produces YYYY-MM-DD
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(iso));
}

export async function executeAutoCheckin(
  kind: CheckinKind,
  employeeId: string,
  branch: BranchConfig,
): Promise<ExecuteResult> {
  const check = await runConditionChecks(branch);

  if (!check.passed) {
    return {
      kind,
      success: false,
      reason: check.failures.join(','),
    };
  }

  const payload: AutoCheckinPayload = {
    employee_id: employeeId,
    wifi_bssid: check.snapshot.wifi_bssid,
    wifi_ssid: check.snapshot.wifi_ssid,
    latitude: check.snapshot.latitude,
    longitude: check.snapshot.longitude,
    gps_accuracy: check.snapshot.gps_accuracy,
    device_id: check.snapshot.device_id,
    device_model: check.snapshot.device_model,
    os_version: check.snapshot.os_version,
    app_version: check.snapshot.app_version,
    timestamp: check.snapshot.timestamp,
    is_vpn_active: check.snapshot.is_vpn_active,
    is_mock_location: check.snapshot.is_mock_location,
  };

  const workDate = toWorkDate(payload.timestamp);
  const idempotencyKey = computeIdempotencyKey(employeeId, kind, workDate);

  try {
    const result =
      kind === 'auto_checkin'
        ? await postAutoCheckin(payload, idempotencyKey)
        : await postAutoCheckout(payload, idempotencyKey);
    return {
      kind,
      success: true,
      branchName: result.branchName,
    };
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    // 4xx = condition failed on server, DON'T queue (server rejected correctly)
    if (status && status >= 400 && status < 500) {
      return {
        kind,
        success: false,
        reason: `SERVER_REJECTED_${status}`,
      };
    }
    // 5xx or network error → queue for offline sync
    await enqueue({
      idempotency_key: idempotencyKey,
      event_type: kind,
      payload,
      client_timestamp: payload.timestamp,
      retries: 0,
      created_at: new Date().toISOString(),
    });
    return {
      kind,
      success: false,
      queued: true,
      reason: 'NETWORK_ERROR_QUEUED',
    };
  }
}
