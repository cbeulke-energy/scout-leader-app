/**
 * Registers a NetInfo listener that triggers syncNow() on reconnect.
 * Returns an unsubscribe function.
 */
import NetInfo from "@react-native-community/netinfo";
import { syncEngine } from "./engine";

export function startNetworkListener(): () => void {
  let wasOffline = false;

  const unsubscribe = NetInfo.addEventListener((state) => {
    const isOnline = state.isConnected === true && state.isInternetReachable !== false;

    if (!isOnline) {
      wasOffline = true;
      return;
    }

    // Fire sync immediately on reconnect, or on first-run while online
    if (wasOffline || !state.isConnected) {
      wasOffline = false;
      syncEngine.syncNow().catch(() => {
        // engine already captures error state internally
      });
    }
  });

  return unsubscribe;
}
