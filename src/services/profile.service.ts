import { assertData } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/domain';
export async function getProfile(userId: string) { const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single(); return assertData(data as Profile | null, error, 'Unable to load your profile.'); }
export async function updateProfile(userId: string, patch: Pick<Profile, 'full_name' | 'phone'>) { const { data, error } = await supabase.from('profiles').update(patch).eq('id', userId).select().single(); return assertData(data as Profile | null, error, 'Unable to update your profile.'); }
