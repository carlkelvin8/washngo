import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { z } from 'zod';

import { Button, Card, Field, Screen, Title } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { friendlyError } from '@/lib/errors';
import { colors } from '@/constants/design';

const schema = z.object({ password: z.string().min(8, 'Use at least 8 characters.'), confirm: z.string() }).refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match.' });

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [exchanging, setExchanging] = useState(true);
  const [redirectPending, setRedirectPending] = useState(false);
  // Delayed /login navigation lives in an effect so the timeout is always
  // cleared on unmount (no navigation-after-unmount).
  useEffect(() => {
    if (!redirectPending) return;
    const timer = setTimeout(() => router.replace('/login'), 1200);
    return () => clearTimeout(timer);
  }, [redirectPending, router]);
  // Handle PKCE code from email link (washngo://reset-password?code=... or web ?code=)
  useEffect(() => {
    let cancelled = false;
    // Closure-scoped (not render-scoped): the same ?code= is never exchanged
    // twice by the initial-URL + live-url-listener paths in this mount.
    // (A plain object in render scope would be recreated every render and
    // defeat the dedup, causing "code already used" races.)
    let exchanged = false;
    const exchangeFromUrl = async (url: string) => {
      if (!url.includes('code=')) return false;
      if (exchanged) return true;
      exchanged = true;
      const { error } = await supabase.auth.exchangeCodeForSession(url);
      if (error && !cancelled && __DEV__) console.warn('PKCE exchange failed', error.message);
      return !error;
    };
    const handle = async () => {
      try {
        let didExchange = false;
        if (typeof window !== 'undefined') {
          const url = window.location.href;
          if (url.includes('code=')) didExchange = await exchangeFromUrl(url);
        }
        if (!didExchange) {
          const initial = await Linking.getInitialURL();
          if (initial && !cancelled) didExchange = await exchangeFromUrl(initial);
        }
        // Only call getSession if we didn't just exchange (prevents race)
        if (!didExchange && !exchanged) await supabase.auth.getSession();
      } catch {
        // ignore — user will see "Auth session missing" on submit if no session
      } finally {
        if (!cancelled) setExchanging(false);
      }
    };
    void handle();
    const sub = Linking.addEventListener('url', ({ url }) => void exchangeFromUrl(url));
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  });

  const submit = handleSubmit(async ({ password }) => {
    if (exchanging) {
      setMessage('Please wait — verifying your reset link…');
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Reset link expired or invalid. Request a new one.');
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setIsSuccess(true);
      setMessage('Password updated. Redirecting to login…');
      // updateUser keeps the recovery session — sign out first so /login
      // doesn't ping-pong with the authenticated RouterGuard redirect.
      try {
        const { signOut } = await import('@/services/auth.service');
        await signOut();
      } catch {
        // still navigate; guard will sort out session state
      }
      setRedirectPending(true);
    } catch (e) {
      setIsSuccess(false);
      setMessage(friendlyError(e));
    }
  });

  return (
    <Screen>
      <Title>Set new password</Title>
      <Card>
        <Controller control={control} name="password" render={({ field }) => <Field label="New password" secureTextEntry value={field.value} onChangeText={field.onChange} error={errors.password?.message} />} />
        <Controller control={control} name="confirm" render={({ field }) => <Field label="Confirm password" secureTextEntry value={field.value} onChangeText={field.onChange} error={errors.confirm?.message} />} />
        {message ? <Text style={[styles.message, isSuccess ? styles.success : styles.error]}>{message}</Text> : null}
        {exchanging ? <Text style={styles.message}>Verifying reset link…</Text> : null}
        <Button loading={isSubmitting || exchanging} onPress={submit}>Update password</Button>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  message: { padding: 12, borderRadius: 10, fontSize: 13, fontWeight: '700' },
  success: { backgroundColor: '#E8F8F1', color: colors.green },
  error: { backgroundColor: '#FFEBEB', color: colors.red },
});
