import { create } from 'zustand';
import type { CheckinEvent, FraudEvent, StatsData } from '@/types';

const MAX_RECENT_CHECKINS = 50;
const MAX_FRAUD_ALERTS = 100;

interface AttendanceStore {
  /** Live check-in events from WebSocket (most recent first, capped at 50) */
  recentCheckins: CheckinEvent[];

  /** Fraud alerts from WebSocket (most severe/recent first, capped at 100) */
  fraudAlerts: FraudEvent[];

  /** Aggregate stats for today (updated via WebSocket stats:update) */
  liveStats: StatsData | null;

  /** Push a new check-in/checkout event to the front of the list */
  addCheckin: (event: CheckinEvent) => void;

  /** Push a new fraud alert event to the front of the list */
  addFraudAlert: (event: FraudEvent) => void;

  /** Replace today's live stats */
  updateStats: (stats: StatsData) => void;

  /** Clear all live data (e.g., on logout) */
  reset: () => void;
}

export const useAttendanceStore = create<AttendanceStore>()((set) => ({
  recentCheckins: [],
  fraudAlerts: [],
  liveStats: null,

  addCheckin: (event: CheckinEvent) =>
    set((state) => ({
      recentCheckins: [event, ...state.recentCheckins].slice(
        0,
        MAX_RECENT_CHECKINS,
      ),
    })),

  addFraudAlert: (event: FraudEvent) =>
    set((state) => ({
      fraudAlerts: [event, ...state.fraudAlerts].slice(0, MAX_FRAUD_ALERTS),
    })),

  updateStats: (stats: StatsData) =>
    set(() => ({
      liveStats: stats,
    })),

  reset: () =>
    set(() => ({
      recentCheckins: [],
      fraudAlerts: [],
      liveStats: null,
    })),
}));

/** Selector helpers */
export const selectRecentCheckins = (state: AttendanceStore): CheckinEvent[] =>
  state.recentCheckins;
export const selectFraudAlerts = (state: AttendanceStore): FraudEvent[] =>
  state.fraudAlerts;
export const selectLiveStats = (state: AttendanceStore): StatsData | null =>
  state.liveStats;
