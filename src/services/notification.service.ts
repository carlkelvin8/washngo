import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { AppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'WashNgo',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return null;

  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId) {
    console.warn('EXPO_PUBLIC_EAS_PROJECT_ID missing — push token not registered');
    return null;
  }

  let token: { data: string };
  try {
    token = await Notifications.getExpoPushTokenAsync({ projectId });
  } catch (e) {
    if (__DEV__) console.warn('getExpoPushTokenAsync failed (simulator/Expo Go without EAS)', e);
    return null;
  }
  const { error } = await supabase.rpc('register_push_token', { p_token: token.data, p_platform: Platform.OS });
  if (error && __DEV__) console.error('Push token registration failed', error);
  return token.data;
}

export async function listNotifications(limit = 30) {
  const { data: auth } = await supabase.auth.getUser();
  const query = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(limit);
  // Explicit user filter defense-in-depth (RLS already restricts)
  if (auth.user) query.eq('user_id', auth.user.id);
  const { data, error } = await query;
  if (error) throw new AppError('Unable to load notifications.', error);
  return (data ?? []) as { id: string; title: string; body: string; data: Record<string, unknown>; created_at: string; read_at: string | null }[];
}

export async function markNotificationRead(id: string) {
  const { data: auth } = await supabase.auth.getUser();
  const query = supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
  if (auth.user) query.eq('user_id', auth.user.id);
  const { error } = await query;
  if (error) throw new AppError('Unable to mark as read.', error);
}
