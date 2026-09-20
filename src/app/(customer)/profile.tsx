import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StyleSheet, Text } from 'react-native';
import { z } from 'zod';

import { Button, Card, Field, Screen, Title } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import { updateProfile } from '@/services/profile.service';
import { friendlyError } from '@/lib/errors';
import { colors } from '@/constants/design';

const schema = z.object({
  full_name: z.string().trim().min(2, 'Enter your full name.').max(120),
  phone: z.string().regex(/^(\+63|0)9\d{9}$/, 'Use a valid Philippine mobile number.'),
});

export default function ProfileScreen() {
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: profile?.full_name ?? '', phone: profile?.phone ?? '' },
  });

  if (!profile) return null;

  const submit = handleSubmit(async (values) => {
    if (!profile) return;
    try {
      const updated = await updateProfile(profile.id, { full_name: values.full_name, phone: values.phone });
      setProfile(updated);
      setIsSuccess(true);
      setMessage('Profile updated.');
    } catch (e) {
      setIsSuccess(false);
      setMessage(friendlyError(e));
    }
  });

  return (
    <Screen>
      <Title eyebrow={`${profile?.role.replace('_',' ')} · ${profile?.status}`}>Your profile</Title>
      <Card>
        <Controller control={control} name="full_name" render={({ field }) => <Field label="Full name" value={field.value} onChangeText={field.onChange} error={errors.full_name?.message} />} />
        <Controller control={control} name="phone" render={({ field }) => <Field label="Mobile number" value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" error={errors.phone?.message} />} />
        {message ? <Text style={[styles.message, isSuccess ? styles.success : styles.error]}>{message}</Text> : null}
        <Button loading={isSubmitting} onPress={submit}>Save changes</Button>
      </Card>
      <Card>
        <Text style={styles.caption}>Avatar upload is ready via `avatars` bucket — wire `expo-image-picker` + storage service next.</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  message: { padding: 12, borderRadius: 10, fontSize: 13, fontWeight: '700' },
  success: { backgroundColor: '#E8F8F1', color: colors.green },
  error: { backgroundColor: '#FFEBEB', color: colors.red },
  caption: { color: colors.muted, fontSize: 12, lineHeight: 18 },
});
