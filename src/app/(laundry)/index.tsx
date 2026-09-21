import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Text, View } from 'react-native';

import { AccountCard } from '@/components/account-card';
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, Metric, Screen, Title, ui } from '@/components/ui';
import { listMyOrders, transitionOrder } from '@/services/order.service';
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
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['partner-orders'] }),
  });

  const reject = useMutation({
    mutationFn: () => transitionOrder(order.id, 'rejected', 'Rejected by partner'),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['partner-orders'] }),
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
  const query = useQuery({ queryKey: ['partner-orders'], queryFn: listMyOrders });

  if (query.isLoading) return <LoadingState label="Loading partner orders…" />;
  if (query.isError) return <ErrorState message="Partner orders are unavailable." retry={() => void query.refetch()} />;

  const active = query.data?.filter((o) => !['completed', 'cancelled', 'rejected'].includes(o.status)) ?? [];
  const revenue = query.data?.filter((o) => o.status === 'completed').reduce((sum, o) => sum + Number(o.laundry_subtotal), 0) ?? 0;

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
