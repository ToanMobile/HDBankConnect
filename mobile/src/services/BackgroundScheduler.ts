import BackgroundFetch from 'react-native-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { executeAutoCheckin } from './AutoCheckinExecutor';
import { flush as flushQueue } from './OfflineQueueManager';
import { fetchMySchedule } from '../api/attendanceApi';

export interface CachedSchedule {
  checkin_time: string;   // HH:MM
  checkout_time: string;  // HH:MM
  window_minutes: number;
  active_days: number[];  // 1=Mon..7=Sun
}

export interface CachedBranch {
  lat: number;
  lng: number;
  radius: number;
  wifi_bssids: string[];
}

const SCHEDULE_KEY = 'sa:cached_schedule';
const BRANCH_KEY = 'sa:cached_branch';
const EMPLOYEE_KEY = 'sa:employee_id';

function nowInVietnam(): { isoDay: number; hhmm: string } {
  const d = new Date();
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'short',
  }).format(d);
  const map: Record<string, number> = {
    Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7,
  };
  const isoDay = map[weekday] ?? 0;
  const hhmm = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
  return { isoDay, hhmm };
}

function minutesBetween(a: string, b: string): number {
  const [ah, am] = a.split(':').map(Number);
  const [bh, bm] = b.split(':').map(Number);
  return (ah! * 60 + am!) - (bh! * 60 + bm!);
}

/**
 * Called by the BackgroundFetch headless task.
 * Decides whether to fire auto-checkin / auto-checkout.
 */
async function backgroundTask(): Promise<void> {
  const [scheduleRaw, branchRaw, employeeId] = await Promise.all([
    AsyncStorage.getItem(SCHEDULE_KEY),
    AsyncStorage.getItem(BRANCH_KEY),
    AsyncStorage.getItem(EMPLOYEE_KEY),
  ]);

  if (!scheduleRaw || !branchRaw || !employeeId) return;

  const schedule = JSON.parse(scheduleRaw) as CachedSchedule;
  const branch = JSON.parse(branchRaw) as CachedBranch;
  const { isoDay, hhmm } = nowInVietnam();

  if (!schedule.active_days.includes(isoDay)) return;

  const minsToCheckin = minutesBetween(hhmm, schedule.checkin_time);
  const minsToCheckout = minutesBetween(hhmm, schedule.checkout_time);

  // Within check-in window (±windowMinutes of check-in time)
  if (Math.abs(minsToCheckin) <= schedule.window_minutes) {
    await executeAutoCheckin('auto_checkin', employeeId, branch);
    return;
  }

  // Within check-out window
  if (Math.abs(minsToCheckout) <= schedule.window_minutes) {
    await executeAutoCheckin('auto_checkout', employeeId, branch);
    return;
  }

  // Otherwise: opportunistic queue flush
  await flushQueue(employeeId);
}

export async function registerBackgroundScheduler(): Promise<void> {
  const status = await BackgroundFetch.configure(
    {
      minimumFetchInterval: 15, // iOS & Android minimum is 15 min
      stopOnTerminate: false,
      startOnBoot: true,
      enableHeadless: true,
      requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
    },
    async (taskId: string) => {
      try {
        await backgroundTask();
      } finally {
        BackgroundFetch.finish(taskId);
      }
    },
    (taskId: string) => {
      // Timeout handler
      BackgroundFetch.finish(taskId);
    },
  );
  if (status !== BackgroundFetch.STATUS_AVAILABLE) {
    console.warn('[BackgroundScheduler] not available: status=', status);
  }
}

export async function syncSchedule(): Promise<void> {
  const schedule = await fetchMySchedule();
  await AsyncStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule));
}

export async function setEmployeeId(id: string): Promise<void> {
  await AsyncStorage.setItem(EMPLOYEE_KEY, id);
}

export async function setBranchConfig(branch: CachedBranch): Promise<void> {
  await AsyncStorage.setItem(BRANCH_KEY, JSON.stringify(branch));
}

export async function triggerManual(): Promise<void> {
  await backgroundTask();
}
