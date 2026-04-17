import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE =
  (globalThis as { API_BASE_URL?: string }).API_BASE_URL ??
  'http://10.0.2.2:3000/api/v1';

export interface AutoCheckinPayload {
  employee_id: string;
  wifi_bssid: string | null;
  wifi_ssid: string | null;
  latitude: number;
  longitude: number;
  gps_accuracy: number;
  device_id: string;
  device_model: string;
  os_version: string;
  app_version: string;
  timestamp: string;
  is_vpn_active: boolean;
  is_mock_location: boolean;
}

let client: AxiosInstance | null = null;

function getClient(): AxiosInstance {
  if (client) return client;
  client = axios.create({
    baseURL: API_BASE,
    timeout: 10000,
  });
  client.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
  return client;
}

export async function postAutoCheckin(
  payload: AutoCheckinPayload,
  idempotencyKey: string,
): Promise<{
  status: 'on_time' | 'late';
  checkInTime: string;
  branchName: string;
}> {
  const { data } = await getClient().post('/attendance/auto-checkin', payload, {
    headers: { 'x-idempotency-key': idempotencyKey },
  });
  return data.data;
}

export async function postAutoCheckout(
  payload: AutoCheckinPayload,
  idempotencyKey: string,
): Promise<{ checkOutTime: string; branchName: string }> {
  const { data } = await getClient().post(
    '/attendance/auto-checkout',
    payload,
    { headers: { 'x-idempotency-key': idempotencyKey } },
  );
  return data.data;
}

export async function postBatchSync(
  employeeId: string,
  items: Array<{
    event_type: string;
    payload: AutoCheckinPayload;
    client_timestamp: string;
    idempotency_key: string;
  }>,
): Promise<{ processed: number; failed: number }> {
  const { data } = await getClient().post('/sync/batch', {
    employee_id: employeeId,
    items,
  });
  return data.data;
}

export async function fetchMySchedule(): Promise<{
  checkin_time: string;
  checkout_time: string;
  window_minutes: number;
  active_days: number[];
}> {
  const { data } = await getClient().get('/schedules/my');
  return data.data;
}
