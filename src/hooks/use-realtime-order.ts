import { useEffect } from 'react';

import { queryClient } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';

export function useRealtimeOrder(orderId?: string) {
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order:${orderId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: ['order', orderId] });
        void queryClient.invalidateQueries({ queryKey: ['orders'] });
        void queryClient.invalidateQueries({ queryKey: ['orders', 'paged'] });
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_status_logs', filter: `order_id=eq.${orderId}` },
        () => void queryClient.invalidateQueries({ queryKey: ['status-logs', orderId] }),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'delivery_jobs', filter: `order_id=eq.${orderId}` },
        () => void queryClient.invalidateQueries({ queryKey: ['order', orderId] }),
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' && __DEV__) console.warn('realtime order channel error', orderId);
      });

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [orderId]);
}
