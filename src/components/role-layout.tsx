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
  if (profile.role !== role) return <Redirect href="/" />;

  return <Stack screenOptions={{ headerShadowVisible: false, headerTitleStyle: { fontWeight: '800' } }} />;
}
