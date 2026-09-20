import { AppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { getProfile } from '@/services/profile.service';

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw new AppError(error.message, error);
  return data;
}

export async function signUp(input: { email: string; password: string; fullName: string; phone: string }) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: { data: { full_name: input.fullName.trim(), phone: input.phone.trim() } },
  });
  if (error) throw new AppError(error.message, error);
  return data;
}

function getResetRedirect(): string {
  // Web must use https origin, native can use deep link scheme
  if (typeof window !== 'undefined' && window.location?.origin?.startsWith('http')) {
    return `${window.location.origin}/reset-password`;
  }
  return 'washngo://reset-password';
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: getResetRedirect(),
  });
  if (error) throw new AppError(error.message, error);
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new AppError('Unable to sign out.', error);
  // Clear local auth state and cached queries immediately (don't await UI)
  try {
    const { useAuthStore } = await import('@/store/auth.store');
    useAuthStore.getState().setAuth(null, null);
    const { queryClient } = await import('@/lib/query-client');
    queryClient.clear();
  } catch {
    // ignore — store/client may already be cleared
  }
}

export async function restoreAuth() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new AppError('Unable to restore your session.', error);
  const session = data.session;
  if (!session) return { session: null, profile: null };
  try {
    const profile = await getProfile(session.user.id);
    return { session, profile };
  } catch (e) {
    if (__DEV__) console.warn('restoreAuth: profile not yet available', e);
    return { session, profile: null };
  }
}
