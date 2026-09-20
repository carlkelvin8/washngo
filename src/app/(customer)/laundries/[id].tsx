import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, Card, ErrorState, LoadingState, Screen, Title, ui } from '@/components/ui';
import { getLaundryShop } from '@/services/laundry.service';
import { listRatingsForShop } from '@/services/rating.service';
import { useBookingStore } from '@/store/booking.store';

export default function ShopDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const patch = useBookingStore((s) => s.patch);
  const query = useQuery({ queryKey: ['laundry', id], queryFn: () => getLaundryShop(id) });
  const reviews = useQuery({ queryKey: ['ratings', id], queryFn: () => listRatingsForShop(id, 5), enabled: Boolean(id) });

  if (query.isLoading) return <LoadingState label="Opening partner…" />;
  if (query.isError || !query.data) return <ErrorState message="This laundry partner is unavailable." retry={() => void query.refetch()} />;

  const shop = query.data;

  return (
    <Screen refreshing={query.isFetching} onRefresh={() => void query.refetch()}>
      <Title eyebrow={`★ ${shop.average_rating.toFixed(1)} · ${shop.is_verified ? 'Verified' : 'Pending verification'}`}>
        {shop.name}
      </Title>
      {shop.description ? <Text style={ui.body}>{shop.description}</Text> : null}
      <Text style={ui.body}>
        {shop.address}, {shop.city}
      </Text>
      <Text style={ui.caption}>{shop.phone}</Text>

      <Text style={ui.h2}>Services</Text>
      {shop.services?.filter((s) => s.is_active).length ? (
        shop.services
          .filter((s) => s.is_active)
          .map((service) => (
            <Card key={service.id}>
              <View style={ui.between}>
                <Text style={ui.h2}>{service.name}</Text>
                <Text style={ui.price}>
                  ₱{service.price}/{service.pricing_type === 'per_kg' ? 'kg' : 'load'}
                </Text>
              </View>
              {service.description ? <Text style={ui.body}>{service.description}</Text> : null}
              <Text style={ui.caption}>
                Minimum ₱{service.minimum_charge} · about {service.estimated_turnaround_hours} hours
              </Text>
              <Button
                onPress={() => {
                  patch({ shopId: shop.id, serviceId: service.id });
                  router.push('/(customer)/booking');
                }}
              >
                Choose service
              </Button>
            </Card>
          ))
      ) : (
        <Card>
          <Text style={ui.h2}>No active services</Text>
          <Text style={ui.body}>This partner has not listed services yet. Check back soon.</Text>
        </Card>
      )}

      <Text style={ui.h2}>Recent reviews</Text>
      {reviews.isLoading ? (
        <Text style={ui.body}>Loading reviews…</Text>
      ) : reviews.data?.length ? (
        reviews.data.map((r) => (
          <Card key={r.id}>
            <Text style={ui.body}>{'★'.repeat(r.stars)} · {new Date(r.created_at).toLocaleDateString()}</Text>
            {r.review ? <Text style={ui.body}>{r.review}</Text> : <Text style={ui.caption}>No comment</Text>}
          </Card>
        ))
      ) : (
        <Text style={ui.body}>No reviews yet — be the first to rate after delivery.</Text>
      )}
    </Screen>
  );
}
