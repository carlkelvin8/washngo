import { z } from 'zod';

const schema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.string().url('Set EXPO_PUBLIC_SUPABASE_URL to your Supabase project URL.'),
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(10, 'Set EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Visible in Expo logs — never throw, so the app can still render an error state.
  console.warn('Supabase env not configured', parsed.error.flatten().fieldErrors);
}

export const env = parsed.success
  ? parsed.data
  : {
      EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'missing-publishable-key',
    };

export const isConfigured = parsed.success;
export const envError = parsed.success ? null : parsed.error.flatten().fieldErrors;
