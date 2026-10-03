import { Redirect } from 'expo-router';

import { LoadingState } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';

// Auth-aware entry: authenticated users go straight to their group instead of
// bouncing through /login (which flashes the login screen while authed).
export default function Index() {
  const { session, profile, restoring } = useAuthStore();
  if (restoring) return <LoadingState label="Preparing WashNgo…" />;
  if (session && profile) {
    const target =
      profile.role === 'customer'
        ? '/(customer)'
        : profile.role === 'rider'
          ? '/(rider)'
          : profile.role === 'laundry_partner'
            ? '/(laundry)'
            : '/(admin)';
    return <Redirect href={target as never} />;
  }
  return <Redirect href="/login" />;
}
