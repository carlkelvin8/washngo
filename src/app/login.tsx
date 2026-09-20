import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Field, Screen, Title, ui } from '@/components/ui';
import { friendlyError } from '@/lib/errors';
import { signIn } from '@/services/auth.service';
import { loginSchema, type LoginValues } from '@/features/auth/schemas';
import { colors } from '@/constants/design';

export default function LoginScreen() {
  const [error, setError] = useState('');
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = handleSubmit(async (values) => {
    setError('');
    try {
      await signIn(values.email, values.password);
    } catch (cause) {
      setError(friendlyError(cause));
    }
  });

  return (
    <Screen>
      <View style={styles.hero}>
        <Title eyebrow="Pick up · Clean · Deliver">Laundry day, handled.</Title>
        <Text style={ui.body}>Book trusted Lipa City laundry partners and follow every handoff live.</Text>
      </View>

      <Card>
        {error ? (
          <Text accessibilityRole="alert" style={styles.errorBox}>
            {error}
          </Text>
        ) : null}

        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <Field
              label="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.email?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <Field
              label="Password"
              secureTextEntry
              autoComplete="password"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.password?.message}
            />
          )}
        />

        <Button onPress={submit} loading={isSubmitting}>
          Sign in
        </Button>
        <Link href="/forgot-password" style={ui.link}>
          Forgot password?
        </Link>
      </Card>

      <Text style={ui.body}>
        New to WashNgo?{' '}
        <Link href="/register" style={ui.link}>
          Create a customer account
        </Link>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: 42, gap: 8 },
  errorBox: { backgroundColor: '#FFEBEB', color: colors.red, padding: 12, borderRadius: 10, fontSize: 13, fontWeight: '700' },
});
