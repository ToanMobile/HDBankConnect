# eCheckAI — Mobile App (React Native)

Employee-facing mobile app that runs the **Zero-Touch auto check-in** flow:
background scheduler fires near work hours, verifies WiFi + GPS + anti-fraud,
and posts to the backend API.

## Running

```bash
# Install deps (once)
npm install
cd ios && pod install && cd ..

# Android
npm run android

# iOS
npm run ios
```

## Architecture

```
src/
├── App.tsx                              ← registers BackgroundFetch
├── navigation/AppNavigator.tsx
├── screens/
│   ├── HomeScreen.tsx
│   ├── AttendanceHistoryScreen.tsx
│   └── SettingsScreen.tsx
├── services/
│   ├── BackgroundScheduler.ts          ← core: schedules task, decides when to fire
│   ├── ConditionChecker.ts             ← WiFi + GPS + VPN + mock-GPS + unlock check
│   ├── AutoCheckinExecutor.ts          ← orchestrate: check → API → queue on fail
│   └── OfflineQueueManager.ts          ← AsyncStorage-backed offline queue
├── utils/
│   ├── haversine.ts                    ← geofence distance
│   ├── idempotencyKey.ts               ← sha256(employeeId|type|workDate)
│   ├── deviceInfo.ts                   ← device_id, last-unlock elapsed
│   └── vpnDetector.ts                  ← VPN + mock-location detection
├── api/
│   └── attendanceApi.ts                ← axios client with JWT interceptor
└── ...
```

## Background Scheduler

- **Android**: `react-native-background-fetch` + `BackgroundFetch.registerHeadlessTask`
  runs even when app is swiped away. Fallback: exact AlarmManager at
  `checkin_time - 5min`.
- **iOS**: `BGAppRefreshTask` (iOS chooses approximate time) +
  `CLCircularRegion` geofence + `startMonitoringSignificantLocationChanges`.

Timing is approximate; the `ConditionChecker` is fail-fast and only posts to
the server when all checks pass. Network failures land in `OfflineQueueManager`
with an idempotency key; the next successful sync dedup-es on the server.

## Anti-Fraud

| Attack | Mitigation |
|---|---|
| Fake GPS (mock provider) | `Location.isMock()` + `react-native-permissions` high-accuracy mode |
| VPN bypass | Native bridge reads `NetworkCapabilities.TRANSPORT_VPN` |
| Buddy punching | `device_id` bound via `/auth/register-device`; server rejects mismatch |
| Device farming | `checkLastUnlock()`: reject if screen hasn't unlocked in 90 min |
| WiFi spoofing | BSSID whitelist per branch (server-side) |
| Network timeout replay | `idempotency_key = sha256(employee|type|workDate)` |

## Testing

```bash
npm run typecheck   # tsc --noEmit
npm test            # jest unit tests
```

## Env

Currently points at Android emulator default (`10.0.2.2:3000`). Override with
a real domain at build time.
