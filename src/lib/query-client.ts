import { onlineManager, QueryClient } from '@tanstack/react-query';
import * as Network from 'expo-network';

// Wire reachability into TanStack so queries/mutations pause (instead of
// failing + burning retries) while offline. Falls back to default behavior
// when the listener API is unavailable.
try {
  const maybe = Network as unknown as {
    addNetworkStateListener?: (cb: (s: Network.NetworkState) => void) => { remove: () => void };
  };
  if (maybe.addNetworkStateListener) {
    onlineManager.setEventListener((setOnline) => {
      const sub = maybe.addNetworkStateListener!((state) => {
        if (typeof state.isInternetReachable === 'boolean') setOnline(state.isInternetReachable);
        else setOnline(state.isConnected ?? true);
      });
      return () => sub.remove();
    });
  }
} catch {
  // keep TanStack defaults
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: false,
      placeholderData: (prev: unknown) => prev,
    },
    mutations: { retry: 0 },
  },
});
