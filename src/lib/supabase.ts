import 'react-native-url-polyfill/auto';
import 'expo-sqlite/localStorage/install';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

const serverStorage = { getItem: async (_key: string) => null, setItem: async (_key: string, _value: string) => undefined, removeItem: async (_key: string) => undefined };
const authStorage = typeof localStorage === 'undefined' ? serverStorage : localStorage;

export const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { storage: authStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } });
