import { Component, useEffect, type ReactNode } from 'react';
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
  useAuthBootstrap();
  const { session, profile, restoring } = useAuthStore();
  const path = usePathname();
  const router = useRouter();

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
    <RootErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <OfflineBanner />
        <RouterGuard />
      </QueryClientProvider>
    </RootErrorBoundary>
  );
}
