import { AppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

export async function submitRating(input: { orderId: string; targetType: 'laundry_shop' | 'rider'; targetId: string; stars: number; review?: string }) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new AppError('Please sign in again.');

  const stars = Math.round(input.stars);
  if (stars < 1 || stars > 5) throw new AppError('Choose 1–5 stars.');

  const { data, error } = await supabase.rpc('submit_rating', {
    p_order_id: input.orderId,
    p_target_type: input.targetType,
    p_target_id: input.targetId,
    p_stars: stars,
    p_review: input.review?.trim() || null,
  });

  if (error) {
    if (error.code === '23505') throw new AppError('You already rated this order.', error);
    throw new AppError(error.message || 'Unable to submit rating.', error);
  }
  return data;
}

export async function listRatingsForShop(shopId: string, limit = 10) {
  const { data, error } = await supabase.from('ratings').select('*').eq('target_id', shopId).eq('target_type', 'laundry_shop').order('created_at', { ascending: false }).limit(limit);
  if (error) throw new AppError('Unable to load reviews.', error);
  return data ?? [];
}
