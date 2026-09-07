import { AppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { getProfile } from '@/services/profile.service';
export async function signIn(email: string, password: string) { const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password }); if (error) throw new AppError(error.message, error); return data; }
export async function signUp(input: { email: string; password: string; fullName: string; phone: string }) { const { data, error } = await supabase.auth.signUp({ email: input.email.trim().toLowerCase(), password: input.password, options: { data: { full_name: input.fullName.trim(), phone: input.phone.trim() } } }); if (error) throw new AppError(error.message, error); return data; }
export async function resetPassword(email: string) { const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: 'washngo://reset-password' }); if (error) throw new AppError(error.message, error); }
export async function signOut() { const { error } = await supabase.auth.signOut(); if (error) throw new AppError('Unable to sign out.', error); }
export async function restoreAuth() { const { data, error } = await supabase.auth.getSession(); if (error) throw new AppError('Unable to restore your session.', error); const session = data.session; return { session, profile: session ? await getProfile(session.user.id) : null }; }
