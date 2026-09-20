import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StyleSheet, Text } from 'react-native';

import { Button, Card, Field, Screen, Title } from '@/components/ui';
import { registrationSchema, type RegistrationValues } from '@/features/auth/schemas';
import { friendlyError } from '@/lib/errors';
import { signUp } from '@/services/auth.service';
import { colors } from '@/constants/design';

const fields: { name: keyof RegistrationValues; label: string; secure?: boolean; keyboard?: 'default' | 'email-address' | 'phone-pad' }[] = [
  { name: 'fullName', label: 'Full name' },
  { name: 'phone', label: 'Mobile number', keyboard: 'phone-pad' },
  { name: 'email', label: 'Email', keyboard: 'email-address' },
  { name: 'password', label: 'Password', secure: true },
];

export default function RegisterScreen() {
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { email: '', password: '', fullName: '', phone: '' },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await signUp(values);
      setIsSuccess(true);
      setMessage('Check your inbox to verify your email, then sign in.');
    } catch (e) {
      setIsSuccess(false);
      setMessage(friendlyError(e));
    }
  });

  return (
    <Screen>
      <Title eyebrow="Customer signup">Join WashNgo</Title>
      <Card>
        {fields.map(({ name, label, secure, keyboard }) => (
          <Controller
            key={name}
            control={control}
            name={name}
            render={({ field }) => (
              <Field
                label={label}
                secureTextEntry={secure}
                keyboardType={keyboard ?? 'default'}
                autoCapitalize={name === 'email' ? 'none' : 'sentences'}
                value={field.value}
                onChangeText={field.onChange}
                error={errors[name]?.message}
              />
            )}
          />
        ))}

        {message ? (
          <Text style={[styles.message, isSuccess ? styles.success : styles.error]} accessibilityRole="alert">
            {message}
          </Text>
        ) : null}

        <Button onPress={submit} loading={isSubmitting}>
          Create account
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
