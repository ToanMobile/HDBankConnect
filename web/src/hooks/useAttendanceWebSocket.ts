import { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useAttendanceStore } from '@/store/attendance.store';
import { useAuthStore } from '@/store/auth.store';
import type { CheckinEvent, FraudEvent, StatsData } from '@/types';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:4000';

export type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseAttendanceWebSocketReturn {
  status: WsStatus;
  disconnect: () => void;
  reconnect: () => void;
}

/**
 * Connects to the Smart Attendance WebSocket server and syncs real-time
 * events (check-in / check-out / fraud / stats) into the Zustand store.
 *
 * Auto-reconnects with exponential backoff on disconnect.
 */
export function useAttendanceWebSocket(): UseAttendanceWebSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<WsStatus>('disconnected');
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { addCheckin, addFraudAlert, updateStats } = useAttendanceStore();

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!isAuthenticated || !accessToken) return;
    if (socketRef.current?.connected) return;

    setStatus('connecting');

    const socket = io(WS_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: false, // We manage reconnection manually
    });

    socketRef.current = socket;

    // u2500u2500 Connection lifecycle u2500u2500
    socket.on('connect', () => {
      setStatus('connected');
      reconnectAttempt.current = 0;
      clearReconnectTimer();
    });

    socket.on('disconnect', (reason) => {
      setStatus('disconnected');

      // Don't auto-reconnect if server intentionally disconnected
      if (reason === 'io server disconnect') {
        return;
      }

      scheduleReconnect();
    });

    socket.on('connect_error', () => {
      setStatus('error');
      scheduleReconnect();
    });

    // u2500u2500 Domain events u2500u2500
    socket.on('attendance:checkin', (event: CheckinEvent) => {
      addCheckin(event);
      toast.success(
        `u2705 ${event.full_name} u0111u00e3 check-in lu00fac ${new Date(event.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
        { description: event.branch_name },
      );
    });

    socket.on('attendance:checkout', (event: CheckinEvent) => {
      addCheckin({ ...event, type: 'checkout' });
      toast.info(
        `u{1F44B} ${event.full_name} u0111u00e3 check-out lu00fac ${new Date(event.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
        { description: event.branch_name },
      );
    });

    socket.on('fraud:detected', (event: FraudEvent) => {
      addFraudAlert(event);
      const severityEmoji: Record<string, string> = {
        critical: 'u{1F6A8}',
        high: 'u26A0uFE0F',
        medium: 'u26A0uFE0F',
        low: 'u2139uFE0F',
      };
      toast.error(
        `${severityEmoji[event.severity] ?? 'u26A0uFE0F'} Phu00e1t hiu1ec7n gian lu1eadn: ${event.full_name}`,
        {
          description: `${event.fraud_type} u2014 ${event.branch_name}`,
          duration: 8000,
        },
      );
    });

    socket.on('stats:update', (stats: StatsData) => {
      updateStats(stats);
    });
  }, [isAuthenticated, accessToken, addCheckin, addFraudAlert, updateStats, clearReconnectTimer]);

  function scheduleReconnect(): void {
    clearReconnectTimer();
    const MAX_DELAY = 30_000;
    const BASE_DELAY = 1_000;
    const delay = Math.min(
      BASE_DELAY * Math.pow(2, reconnectAttempt.current),
      MAX_DELAY,
    );
    reconnectAttempt.current += 1;

    reconnectTimer.current = setTimeout(() => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      connect();
    }, delay);
  }

  const disconnect = useCallback(() => {
    clearReconnectTimer();
    socketRef.current?.disconnect();
    socketRef.current = null;
    setStatus('disconnected');
  }, [clearReconnectTimer]);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttempt.current = 0;
    connect();
  }, [disconnect, connect]);

  // Auto-connect when authenticated
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      clearReconnectTimer();
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  return { status, disconnect, reconnect };
}
