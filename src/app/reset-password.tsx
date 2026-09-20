import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
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
  // Handle PKCE code from email link (washngo://reset-password?code=... or web ?code=)
  useEffect(() => {
    let cancelled = false;
    const handle = async () => {
      try {
        // Try to exchange code if present in URL (web) or deep link query
        if (typeof window !== 'undefined') {
          const url = window.location.href;
          if (url.includes('code=')) {
            const { error } = await supabase.auth.exchangeCodeForSession(url);
            if (error && !cancelled && __DEV__) console.warn('PKCE exchange failed', error.message);
          } else {
            await supabase.auth.getSession();
          }
        } else {
          await supabase.auth.getSession();
        }
      } catch {
        // ignore — user will see "Auth session missing" on submit if no session
      }
    };
    void handle();
    return () => {
      cancelled = true;
    };
  }, []);
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  });

  const submit = handleSubmit(async ({ password }) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setIsSuccess(true);
      setMessage('Password updated. Redirecting to login…');
      setTimeout(() => router.replace('/login'), 1200);
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
        <Button loading={isSubmitting} onPress={submit}>Update password</Button>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  message: { padding: 12, borderRadius: 10, fontSize: 13, fontWeight: '700' },
  success: { backgroundColor: '#E8F8F1', color: colors.green },
  error: { backgroundColor: '#FFEBEB', color: colors.red },
});
