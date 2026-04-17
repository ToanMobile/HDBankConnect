import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';

export interface DeviceSnapshot {
  device_id: string;
  device_model: string;
  os_version: string;
  app_version: string;
}

export async function getDeviceSnapshot(): Promise<DeviceSnapshot> {
  const [deviceId, model, osVersion, appVersion] = await Promise.all([
    DeviceInfo.getUniqueId(),
    Promise.resolve(DeviceInfo.getModel()),
    Promise.resolve(DeviceInfo.getSystemVersion()),
    Promise.resolve(DeviceInfo.getVersion()),
  ]);
  return {
    device_id: deviceId,
    device_model: model,
    os_version: `${Platform.OS} ${osVersion}`,
    app_version: appVersion,
  };
}

/**
 * Check how many minutes since last screen unlock.
 * Used to defeat "device farming" — refuse auto-checkin if device has not
 * been unlocked in the last 90 minutes.
 *
 * Native modules needed: this is a stub; production should bridge to
 *  - Android: KeyguardManager.isDeviceLocked / UsageStatsManager
 *  - iOS: UIApplication.protectedDataAvailable
 */
export async function getLastUnlockElapsedMinutes(): Promise<number> {
  // Stub: returns 5 (assume recently unlocked). Replace with native bridge.
  return 5;
}
