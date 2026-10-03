import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Text, View } from 'react-native';
import { useEffect } from 'react';

import { AccountCard } from '@/components/account-card';
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, Metric, Screen, Title, ui } from '@/components/ui';
import { listMyOrders, transitionOrder } from '@/services/order.service';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/query-client';
import { friendlyError } from '@/lib/errors';
import type { Order, OrderStatus } from '@/types/domain';

const next: Partial<Record<OrderStatus, { label: string; status: OrderStatus }>> = {
  laundry_confirmation: { label: 'Accept booking', status: 'confirmed' },
  received_by_laundry: { label: 'Start processing', status: 'processing' },
  processing: { label: 'Ready for return', status: 'ready_for_return' },
};

function OrderCard({ order }: { order: Order }) {
  const action = next[order.status];
  const mutation = useMutation({
    mutationFn: () => transitionOrder(order.id, action!.status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['partner-orders'] });
      // Customer screens read separate keys — nudge them too (realtime covers
      // the live case; this covers mounted-without-subscription).
      void queryClient.invalidateQueries({ queryKey: ['order', order.id] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const reject = useMutation({
    mutationFn: () => transitionOrder(order.id, 'rejected', 'Rejected by partner'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['partner-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['order', order.id] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  return (
    <Card>
      <View style={ui.between}>
        <Text style={ui.h2}>{order.order_number}</Text>
        <Badge>{order.status.replaceAll('_', ' ')}</Badge>
      </View>
      <Text style={ui.body}>
        Pickup {order.pickup_date} · {order.estimated_weight} kg estimated
      </Text>
      <Text style={ui.price}>₱{Number(order.total_amount).toFixed(2)}</Text>
      {mutation.error ? <Text style={{ color: '#D64545', fontSize: 12 }}>{friendlyError(mutation.error)}</Text> : null}
      {reject.error ? <Text style={{ color: '#D64545', fontSize: 12 }}>{friendlyError(reject.error)}</Text> : null}
      {action ? (
        <Button loading={mutation.isPending} onPress={() => mutation.mutate()}>
          {action.label}
        </Button>
      ) : null}
      {order.status === 'laundry_confirmation' ? (
        <Button
          variant="danger"
          loading={reject.isPending}
          onPress={() =>
            Alert.alert('Reject booking?', 'This will notify the customer and cancel this request.', [
              { text: 'Keep booking', style: 'cancel' },
              { text: 'Reject', style: 'destructive', onPress: () => reject.mutate() },
            ])
          }
        >
          Reject
        </Button>
      ) : null}
    </Card>
  );
}

export default function LaundryDashboard() {
  const profile = useAuthStore((s) => s.profile);
  const query = useQuery({ queryKey: ['partner-orders'], queryFn: listMyOrders, enabled: profile?.status === 'approved' });

  // The board claimed realtime but only refetched manually — subscribe to
  // order changes so new bookings/rejections appear without pull-to-refresh.
  // (Invalidation is cheap and harmless even for other shops' updates.)
  useEffect(() => {
    const channel = supabase
      .channel('partner-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () =>
        queryClient.invalidateQueries({ queryKey: ['partner-orders'] }),
      )
      .subscribe((s) => {
        if (s === 'CHANNEL_ERROR' && __DEV__) console.warn('partner orders channel error');
      });
    return () => {
      try {
        const out = supabase.removeChannel(channel) as unknown;
        if (out instanceof Promise) out.catch(() => {});
      } catch {}
    };
  }, []);

  if (query.isLoading) return <LoadingState label="Loading partner orders…" />;
  if (query.isError) return <ErrorState message="Partner orders are unavailable." retry={() => void query.refetch()} />;

  // Pending/suspended partners pass the role gate — hold them here like the
  // rider board does instead of showing an empty workspace.
  if (profile?.status !== 'approved') {
    return (
      <Screen>
        <Title>Verification {profile?.status ?? 'pending'}</Title>
        <Text style={ui.body}>You can accept bookings after an admin approves your laundry partner account.</Text>
        <AccountCard />
      </Screen>
    );
  }

  const active = query.data?.filter((o) => !['completed', 'cancelled', 'rejected'].includes(o.status)) ?? [];
  const revenue = query.data
    ?.filter((o) => o.status === 'completed')
    .reduce((sum, o) => {
      const v = Number(o.laundry_subtotal);
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0) ?? 0;

  return (
    <Screen refreshing={query.isFetching} onRefresh={() => void query.refetch()}>
      <Title eyebrow="Partner workspace">Laundry operations</Title>
      <View style={ui.grid}>
        <Metric label="Active orders" value={active.length} />
        <Metric label="Laundry revenue" value={`₱${Number(revenue).toFixed(2)}`} hint="Completed orders" />
      </View>
      {active.length ? active.map((o) => <OrderCard key={o.id} order={o} />) : <EmptyState title="All caught up" message="Incoming bookings will appear here in realtime. Pull to refresh." />}
      <AccountCard />
    </Screen>
  );
}
