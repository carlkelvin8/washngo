import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, Screen, Title, ui } from '@/components/ui';
import { listLaundryShops } from '@/services/laundry.service';
import { listMyOrders } from '@/services/order.service';
import { orderStatusLabel, orderStatusTone } from '@/lib/order-status';
import { useAuthStore } from '@/store/auth.store';

export default function CustomerHome() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);

  const shops = useQuery({ queryKey: ['laundries'], queryFn: () => listLaundryShops() });
  const orders = useQuery({ queryKey: ['orders'], queryFn: listMyOrders });

  const refreshing = shops.isFetching || orders.isFetching;
  const onRefresh = useCallback(() => {
    void shops.refetch();
    void orders.refetch();
  }, [shops, orders]);

  if (shops.isLoading || orders.isLoading) return <LoadingState label="Finding nearby laundries…" />;
  if (shops.isError || orders.isError) {
    return (
      <ErrorState
        message="We could not load your home feed."
        retry={() => {
          void shops.refetch();
          void orders.refetch();
        }}
      />
    );
  }

  const active = orders.data?.find((o) => !['completed', 'cancelled', 'rejected'].includes(o.status));
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Title eyebrow={`Hello, ${firstName}`}>Fresh clothes, zero errands.</Title>

      {active ? (
        <Card onPress={() => router.push(`/(customer)/orders/${active.id}`)}>
          <View style={ui.between}>
            <Text style={ui.caption}>ACTIVE ORDER · {active.order_number}</Text>
            <Badge tone={orderStatusTone(active.status)}>{orderStatusLabel(active.status)}</Badge>
          </View>
          <Text style={ui.h2}>{active.laundry_shop?.name ?? 'Your laundry'}</Text>
          <Text style={ui.body}>Tap for live tracking and handoff history.</Text>
        </Card>
      ) : (
        <Card>
          <Text style={ui.h2}>Laundry piling up?</Text>
          <Text style={ui.body}>Choose a trusted partner and schedule pickup in minutes.</Text>
          <Button onPress={() => router.push('/(customer)/laundries')}>Book pickup</Button>
        </Card>
      )}

      <View style={ui.between}>
        <Text style={ui.h2}>Nearby partners</Text>
        <Link href="/(customer)/laundries" style={ui.link}>
          See all
        </Link>
      </View>

      {shops.data?.length ? (
        shops.data.slice(0, 3).map((shop) => (
          <Card key={shop.id} onPress={() => router.push(`/(customer)/laundries/${shop.id}`)}>
            <View style={ui.between}>
              <Text style={ui.h2}>{shop.name}</Text>
              <Text>★ {shop.average_rating.toFixed(1)}</Text>
            </View>
            <Text style={ui.body}>{shop.address}</Text>
            <Text style={ui.caption}>{shop.services?.filter((s) => s.is_active).map((s) => s.name).join(' · ') || 'Services available'}</Text>
          </Card>
        ))
      ) : (
        <EmptyState title="No partners nearby" message="Verified Lipa City partners will appear here once onboarding completes." />
      )}

      <View style={ui.between}>
        <Text style={ui.h2}>Recent orders</Text>
        <Link href="/(customer)/orders" style={ui.link}>
          History
        </Link>
      </View>

      {orders.data?.length ? (
        orders.data.slice(0, 2).map((order) => (
          <Card key={order.id} onPress={() => router.push(`/(customer)/orders/${order.id}`)}>
            <View style={ui.between}>
              <Text style={ui.h2}>{order.order_number}</Text>
              <Badge tone={orderStatusTone(order.status)}>{orderStatusLabel(order.status)}</Badge>
            </View>
            <Text style={ui.body}>{order.laundry_shop?.name ?? 'Laundry order'}</Text>
            <Text style={ui.price}>₱{order.total_amount.toFixed(2)}</Text>
          </Card>
        ))
      ) : (
        <EmptyState title="No orders yet" message="Book your first pickup to see live updates here." />
      )}
    </Screen>
  );
}
