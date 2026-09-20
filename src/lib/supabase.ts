import 'react-native-url-polyfill/auto';
import 'expo-sqlite/localStorage/install';
import { createClient } from '@supabase/supabase-js';

import { env } from '@/lib/env';

const serverStorage = {
  getItem: async (_key: string): Promise<string | null> => null,
  setItem: async (_key: string, _value: string): Promise<void> => undefined,
  removeItem: async (_key: string): Promise<void> => undefined,
};

function getAuthStorage() {
  try {
    if (typeof localStorage !== 'undefined' && localStorage !== null && typeof localStorage.getItem === 'function') {
      return localStorage;
    }
  } catch {
    // private browsing / SSR may throw on access
  }
  return serverStorage;
}

export const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: getAuthStorage(),
    storageKey: 'washngo-auth',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
