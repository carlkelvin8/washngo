import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StyleSheet, Text } from 'react-native';
import type { z } from 'zod';

import { Button, Card, Field, Screen, Title } from '@/components/ui';
import { resetSchema } from '@/features/auth/schemas';
import { resetPassword } from '@/services/auth.service';
import { friendlyError } from '@/lib/errors';
import { colors } from '@/constants/design';

export default function ForgotScreen() {
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: '' },
  });

  return (
    <Screen>
      <Title>Reset your password</Title>
      <Card>
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <Field
              label="Account email"
              value={field.value}
              onChangeText={field.onChange}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              error={errors.email?.message}
            />
          )}
        />

        {message ? (
          <Text style={[styles.message, isSuccess ? styles.success : styles.error]} accessibilityRole="alert">
            {message}
          </Text>
        ) : null}

        <Button
          loading={isSubmitting}
          onPress={handleSubmit(async ({ email }) => {
            try {
              await resetPassword(email);
              setIsSuccess(true);
              setMessage('Reset link sent. Check your inbox and follow the instructions.');
            } catch (e) {
              setIsSuccess(false);
              setMessage(friendlyError(e));
            }
          })}
        >
          Send reset link
        </Button>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  message: { padding: 12, borderRadius: 10, fontSize: 13, fontWeight: '700' },
  success: { backgroundColor: '#E8F8F1', color: colors.green },
  error: { backgroundColor: '#FFEBEB', color: colors.red },
});
