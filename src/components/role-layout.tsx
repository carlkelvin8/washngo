import type { PropsWithChildren } from 'react';
import { Redirect, Stack } from 'expo-router';

import { LoadingState } from '@/components/ui';
import type { AppRole } from '@/types/domain';
import { useAuthStore } from '@/store/auth.store';

export function RoleLayout({ role }: PropsWithChildren<{ role: AppRole }>) {
  const { session, profile, restoring } = useAuthStore();

  if (restoring) return <LoadingState label="Loading…" />;
  if (!session) return <Redirect href="/login" />;
  if (!profile) return <LoadingState label="Loading your account…" />;
  // Redirect straight to the user's own group — bouncing through "/" flashes
  // /login while authenticated and breaks deep links.
  if (profile.role !== role) {
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

  return <Stack screenOptions={{ headerShadowVisible: false, headerTitleStyle: { fontWeight: '800' } }} />;
}
