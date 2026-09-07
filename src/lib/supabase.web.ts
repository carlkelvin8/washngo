import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

const browserStorage = typeof window === 'undefined' ? undefined : window.localStorage;

export const supabase = createClient(
  env.EXPO_PUBLIC_SUPABASE_URL,
  env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      ...(browserStorage ? { storage: browserStorage } : {}),
      autoRefreshToken: Boolean(browserStorage),
      persistSession: Boolean(browserStorage),
      detectSessionInUrl: Boolean(browserStorage),
    },
  },
);
