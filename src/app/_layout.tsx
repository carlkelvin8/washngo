import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LoadingState } from '@/components/ui';
import { queryClient } from '@/lib/query-client';
import { useAuthBootstrap } from '@/hooks/use-auth-bootstrap';
import { useAuthStore } from '@/store/auth.store';
const groups = { customer: '(customer)', rider: '(rider)', laundry_partner: '(laundry)', admin: '(admin)' } as const;
function RouterGuard() { useAuthBootstrap(); const { session, profile, restoring } = useAuthStore(); const path = usePathname(); const router = useRouter(); useEffect(() => { if (restoring) return; const inAuth = path.startsWith('/login') || path.startsWith('/register') || path.startsWith('/forgot-password'); if (!session && !inAuth) router.replace('/login'); else if (session && profile && (inAuth || path === '/')) router.replace(`/${groups[profile.role]}`); }, [path, profile, restoring, router, session]); if (restoring) return <LoadingState label="Preparing WashNgo…" />; return <Stack screenOptions={{ headerShadowVisible: false, headerTintColor: '#2166F3', headerStyle: { backgroundColor: '#F5F8FF' }, headerTitleStyle: { color: '#11233F', fontWeight: '900' }, contentStyle: { backgroundColor: '#F5F8FF' } }}><Stack.Screen name="index" options={{ headerShown: false }} /><Stack.Screen name="login" options={{ headerShown: false }} /><Stack.Screen name="register" options={{ headerShown: false }} /><Stack.Screen name="forgot-password" options={{ headerShown: false }} /><Stack.Screen name="(customer)" options={{ headerShown: false }} /><Stack.Screen name="(rider)" options={{ headerShown: false }} /><Stack.Screen name="(laundry)" options={{ headerShown: false }} /><Stack.Screen name="(admin)" options={{ headerShown: false }} /></Stack>; }
export default function RootLayout() { return <QueryClientProvider client={queryClient}><StatusBar style="dark" /><RouterGuard /></QueryClientProvider>; }
