import { assertData } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/domain';

export async function getProfile(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error && (error as { code?: string }).code === 'PGRST116') {
    // handle_new_user trigger lag — retry once after short delay
    await new Promise((r) => setTimeout(r, 600));
    const retry = await supabase.from('profiles').select('*').eq('id', userId).single();
    return assertData(retry.data as Profile | null, retry.error, 'Unable to load your profile.');
  }
  return assertData(data as Profile | null, error, 'Unable to load your profile.');
}

export async function updateProfile(userId: string, patch: Pick<Profile, 'full_name' | 'phone'>) {
  const { data, error } = await supabase.from('profiles').update(patch).eq('id', userId).select().single();
  return assertData(data as Profile | null, error, 'Unable to update your profile.');
}
