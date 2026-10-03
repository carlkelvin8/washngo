import { AppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { Address } from '@/types/domain';

export async function listAddresses(): Promise<Address[]> {
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw new AppError('Unable to load addresses.', error);
  return (data ?? []) as Address[];
}

export async function createAddress(input: Omit<Address, 'id' | 'user_id' | 'created_at'>) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new AppError('Please sign in again.');
  const { data, error } = await supabase.from('addresses').insert({ ...input, user_id: auth.user.id }).select().single();
  if (error) throw new AppError('Unable to save address.', error);
  return data as Address;
}

export async function removeAddress(id: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new AppError('Please sign in again.');
  // Scope by owner so one user can never delete another's address even if
  // RLS is misconfigured; surface FK blocks (address on live orders) clearly.
  const { error } = await supabase.from('addresses').delete().eq('id', id).eq('user_id', auth.user.id);
  if (error) {
    if (error.code === '23503') throw new AppError('This address is linked to an existing order and cannot be removed.', error);
    throw new AppError('Unable to remove address.', error);
  }
}
