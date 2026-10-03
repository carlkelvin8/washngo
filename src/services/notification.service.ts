import * as Notifications from 'expo-notifications';
import * as Constants from 'expo-constants';
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

  // expo-constants v57 no longer types expoConfig — read defensively.
  const legacyConfig = (Constants as unknown as { expoConfig?: { extra?: { eas?: { projectId?: string } } } }).expoConfig;
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? legacyConfig?.extra?.eas?.projectId;
  if (!projectId) {
    if (__DEV__) console.warn('EXPO_PUBLIC_EAS_PROJECT_ID missing — push token not registered');
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
  // Fail loud: returning the token when the DB write failed tells the caller
  // push works when it silently never will.
  if (error) throw new AppError('Push notifications could not be enabled.', error);
  return token.data;
}

export async function listNotifications(limit = 30) {
  const { data: auth } = await supabase.auth.getUser();
  // Fail closed: without a user there is no safe filter — don't run an
  // unfiltered query that leans entirely on RLS.
  if (!auth.user) throw new AppError('Please sign in again.');
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new AppError('Unable to load notifications.', error);
  return (data ?? []) as { id: string; title: string; body: string; data: Record<string, unknown>; created_at: string; read_at: string | null }[];
}

export async function markNotificationRead(id: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new AppError('Please sign in again.');
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).eq('user_id', auth.user.id);
  if (error) throw new AppError('Unable to mark as read.', error);
}
