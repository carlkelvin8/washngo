import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { OfflineBanner } from '@/components/offline-banner';
import { LoadingState } from '@/components/ui';
import { queryClient } from '@/lib/query-client';
import { useAuthBootstrap } from '@/hooks/use-auth-bootstrap';
import { useAuthStore } from '@/store/auth.store';

const groups = {
  customer: '(customer)',
  rider: '(rider)',
  laundry_partner: '(laundry)',
  admin: '(admin)',
} as const;

function RouterGuard() {
  useAuthBootstrap();
  const { session, profile, restoring } = useAuthStore();
  const path = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (restoring) return;

    const inAuth =
      path.startsWith('/login') ||
      path.startsWith('/register') ||
      path.startsWith('/forgot-password') ||
      path.startsWith('/reset-password');

    if (!session && !inAuth) {
      router.replace('/login');
      return;
    }

    // Authenticated but profile still loading/errored — stay on loading, don't loop
    if (session && !profile) return;

    if (session && profile && (inAuth || path === '/')) {
      const target = groups[profile.role];
      // Prevent redirect loop if already inside target group
      if (!path.startsWith(`/${target}`)) {
        router.replace(`/${target}` as never);
      }
    }
  }, [path, profile, restoring, router, session]);

  if (restoring) return <LoadingState label="Preparing WashNgo…" />;
  // Show loading instead of blank stack while profile resolves after session
  if (session && !profile) return <LoadingState label="Loading your account…" />;

  return (
    <Stack screenOptions={{ headerShadowVisible: false, headerTitleStyle: { fontWeight: '800' } }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ title: 'Create account' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Reset password' }} />
      <Stack.Screen name="reset-password" options={{ title: 'Set new password' }} />
      <Stack.Screen name="(customer)" options={{ headerShown: false }} />
      <Stack.Screen name="(rider)" options={{ headerShown: false }} />
      <Stack.Screen name="(laundry)" options={{ headerShown: false }} />
      <Stack.Screen name="(admin)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <OfflineBanner />
      <RouterGuard />
    </QueryClientProvider>
  );
}
