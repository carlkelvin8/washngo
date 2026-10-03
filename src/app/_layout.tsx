import { Component, useEffect, useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { OfflineBanner } from '@/components/offline-banner';
import { Button, LoadingState } from '@/components/ui';
import { queryClient } from '@/lib/query-client';
import { useAuthBootstrap } from '@/hooks/use-auth-bootstrap';
import { useAuthStore } from '@/store/auth.store';
import { signOut } from '@/services/auth.service';
import { friendlyError } from '@/lib/errors';
import { isConfigured, envError } from '@/lib/env';
import { colors, space } from '@/constants/design';

SplashScreen.preventAutoHideAsync().catch(() => {});

const groups = {
  customer: '(customer)',
  rider: '(rider)',
  laundry_partner: '(laundry)',
  admin: '(admin)',
} as const;

class RootErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    if (__DEV__) console.error('RootErrorBoundary', error);
  }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: space.xl, gap: space.md, backgroundColor: colors.canvas }}>
          <Text style={{ fontSize: 20, fontWeight: '900', color: colors.navy, textAlign: 'center' }}>Something went wrong</Text>
          <Text style={{ color: colors.muted, textAlign: 'center' }}>{this.state.error.message || 'Unexpected error. Restart the app.'}</Text>
          <Button onPress={() => this.setState({ error: null })}>Try again</Button>
        </View>
      );
    }
    return this.props.children;
  }
}

function RouterGuard() {
  // Don't hit a dummy Supabase host when env is missing — show config error instead.
  useAuthBootstrap(!isConfigured);
  const { session, profile, restoring } = useAuthStore();
  const path = usePathname();
  const router = useRouter();
  const [retryError, setRetryError] = useState('');

  // register_push_token was dead code (never called) — register once per
  // sign-in so order/rider notifications can reach the device. Failures are
  // DEV-visible in the service; never block startup on push.
  useEffect(() => {
    if (!session || !profile || !isConfigured) return;
    let cancelled = false;
    void import('@/services/notification.service')
      .then(({ registerForPushNotifications }) => (cancelled ? null : registerForPushNotifications()))
      .catch((e) => {
        if (__DEV__) console.warn('push registration failed', e);
      });
    return () => {
      cancelled = true;
    };
  }, [session, profile]);

  useEffect(() => {
    if (!restoring) void SplashScreen.hideAsync().catch(() => {});
  }, [restoring]);

  useEffect(() => {
    if (restoring) return;

    const inAuth =
      path.startsWith('/login') ||
      path.startsWith('/register') ||
      path.startsWith('/forgot-password') ||
      path.startsWith('/reset-password');
    // Recovery flow needs its Supabase session to stay on the page:
    // redirecting away mid-exchange makes password reset uncompletable.
    const isRecovery = path.startsWith('/reset-password');

    if (!session && !inAuth) {
      router.replace('/login');
      return;
    }

    // Authenticated but profile still loading/errored — stay on loading, don't loop
    if (session && !profile) return;

    if (session && profile && ((inAuth && !isRecovery) || path === '/')) {
      const target = groups[profile.role];
      // Prevent redirect loop if already inside target group
      if (!path.startsWith(`/${target}`)) {
        router.replace(`/${target}` as never);
      }
    }
  }, [path, profile, restoring, router, session]);

  if (!isConfigured) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: space.xl, gap: space.md, backgroundColor: colors.canvas }}>
        <Text style={{ fontSize: 20, fontWeight: '900', color: colors.navy, textAlign: 'center' }}>Configuration error</Text>
        <Text style={{ color: colors.muted, textAlign: 'center' }}>Supabase is not configured. {JSON.stringify(envError)}</Text>
      </View>
    );
  }

  if (restoring) return <LoadingState label="Preparing WashNgo…" />;
  // Session exists but profile won't resolve (RLS/network/missing row) — offer
  // retry + sign-out instead of hanging on a spinner forever.
  if (session && !profile) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: space.xl, gap: space.md, backgroundColor: colors.canvas }}>
        <LoadingState label="Loading your account…" />
        <Text style={{ color: colors.muted, textAlign: 'center' }}>Taking too long? Your profile may be unreachable.</Text>
        {retryError ? <Text style={{ color: colors.red, textAlign: 'center' }}>{retryError}</Text> : null}
        <Button
          onPress={() => {
            setRetryError('');
            const { setRestoring, setAuth } = useAuthStore.getState();
            setRestoring(true);
            import('@/services/auth.service')
              .then(({ restoreAuth }) => restoreAuth())
              .then(({ session: s, profile: p }) => setAuth(s, p))
              // Silent catch left the user on a spinner with no reason —
              // surface the failure so they know whether to retry or sign out.
              .catch((e) => setRetryError(friendlyError(e)))
              .finally(() => setRestoring(false));
          }}
        >
          Retry
        </Button>
        <Button variant="secondary" onPress={() => void signOut().catch(() => {})}>
          Sign out
        </Button>
      </View>
    );
  }

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
    <RootErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <OfflineBanner />
        <RouterGuard />
      </QueryClientProvider>
    </RootErrorBoundary>
  );
}
