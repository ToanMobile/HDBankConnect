import { NativeModules, Platform } from 'react-native';

/**
 * Detect if a VPN is currently active on the device.
 * - Android: check NetworkCapabilities.TRANSPORT_VPN (needs native bridge)
 * - iOS:     check CFNetworkCopySystemProxySettings or NEVPNManager
 *
 * This stub returns false; production code should use a native module.
 */
export async function isVpnActive(): Promise<boolean> {
  try {
    const { VpnModule } = NativeModules as {
      VpnModule?: { isActive: () => Promise<boolean> };
    };
    if (VpnModule?.isActive) {
      return await VpnModule.isActive();
    }
  } catch {
    // swallow — fall through to heuristic
  }
  // Heuristic fallback (web/dev): always false
  void Platform;
  return false;
}

/**
 * Detect mock/fake GPS location.
 * - Android: Location.isFromMockProvider() in API < 31, Location.isMock() ≥ 31
 * - iOS:     not directly detectable; rely on GPS accuracy + jitter heuristic
 */
export async function isMockLocationActive(): Promise<boolean> {
  try {
    const { MockLocationModule } = NativeModules as {
      MockLocationModule?: { isActive: () => Promise<boolean> };
    };
    if (MockLocationModule?.isActive) {
      return await MockLocationModule.isActive();
    }
  } catch {
    // fall through
  }
  return false;
}
