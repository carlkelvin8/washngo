import { useEffect, useState } from 'react';
import * as Network from 'expo-network';

function resolveConnected(state: Network.NetworkState): boolean {
  // isInternetReachable is more reliable than isConnected (captive portals)
  if (typeof state.isInternetReachable === 'boolean') return state.isInternetReachable;
  return state.isConnected ?? true;
}

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    const apply = (state: Network.NetworkState) => {
      if (mounted) setIsConnected(resolveConnected(state));
    };

    void Network.getNetworkStateAsync()
      .then(apply)
      .catch(() => {
        if (mounted) setIsConnected(true);
      });

    let subscription: { remove: () => void } | undefined;
    // Use event listener when available (Expo SDK 57+) instead of polling
    try {
      const maybe = Network as unknown as {
        addNetworkStateListener?: (cb: (s: Network.NetworkState) => void) => { remove: () => void };
      };
      if (maybe.addNetworkStateListener) {
        subscription = maybe.addNetworkStateListener(apply);
      }
    } catch {
      // fallback to polling
    }

    let interval: ReturnType<typeof setInterval> | undefined;
    if (!subscription) {
      interval = setInterval(() => {
        void Network.getNetworkStateAsync().then(apply).catch(() => {});
      }, 8000);
    }

    return () => {
      mounted = false;
      subscription?.remove();
      if (interval) clearInterval(interval);
    };
  }, []);

  return { isConnected, isOffline: isConnected === false };
}
