import { z } from 'zod';
const schema = z.object({ EXPO_PUBLIC_SUPABASE_URL: z.string().url(), EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(10) });
const parsed = schema.safeParse(process.env);
export const env = parsed.success ? parsed.data : { EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'missing-publishable-key' };
export const isConfigured = parsed.success;
