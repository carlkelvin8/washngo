import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, Screen, Title, ui } from '@/components/ui';
import { listMyOrdersPage } from '@/services/order.service';
import { orderStatusTone } from '@/lib/order-status';

export default function Orders() {
  const router = useRouter();
  const query = useInfiniteQuery({
    queryKey: ['orders', 'paged'],
    queryFn: ({ pageParam }) => listMyOrdersPage(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length : undefined),
  });

  if (query.isLoading) return <LoadingState label="Loading orders…" />;
  if (query.isError) return <ErrorState message="Order history is unavailable." retry={() => void query.refetch()} />;

  const orders = query.data?.pages.flatMap((p) => p.data) ?? [];
  const isRefreshing = query.isFetching && !query.isFetchingNextPage;

  return (
    <Screen refreshing={isRefreshing} onRefresh={() => void query.refetch()}>
      <Title>Your orders</Title>
      {orders.length ? (
        <>
          {orders.map((order) => (
            <Card key={order.id} onPress={() => router.push(`/(customer)/orders/${order.id}`)}>
              <View style={ui.between}>
                <Text style={ui.h2}>{order.order_number}</Text>
                <Badge tone={orderStatusTone(order.status)}>{order.status.replaceAll('_', ' ')}</Badge>
              </View>
              <Text style={ui.body}>{order.laundry_shop?.name ?? 'Laundry order'}</Text>
              <Text style={ui.price}>₱{Number(order.total_amount).toFixed(2)}</Text>
              <Text style={ui.caption}>
                {new Date(order.created_at).toLocaleDateString()} · {order.payment_method === 'cod' ? 'COD' : 'Pay later'}
              </Text>
            </Card>
          ))}
          {query.hasNextPage ? (
            <Button variant="secondary" loading={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()}>
              Load more
            </Button>
          ) : (
            <Text style={ui.caption}>You have reached the end of your history.</Text>
          )}
        </>
      ) : (
        <EmptyState title="No orders yet" message="Your laundry journey will appear here once you book." />
      )}
    </Screen>
  );
}
