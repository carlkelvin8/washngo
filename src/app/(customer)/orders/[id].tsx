import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Badge, Button, Card, ErrorState, Field, LoadingState, Screen, Title, ui } from '@/components/ui';
import { OrderChat } from '@/components/order-chat';
import { TrackingMap } from '@/components/tracking-map';
import { getOrder, transitionOrder } from '@/services/order.service';
import { submitRating } from '@/services/rating.service';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/query-client';
import { friendlyError } from '@/lib/errors';
import { orderStatusLabel, orderStatusTone } from '@/lib/order-status';
import { useRealtimeOrder } from '@/hooks/use-realtime-order';
import { colors } from '@/constants/design';

function getParamId(raw: string | string[] | undefined): string | undefined {
  if (Array.isArray(raw)) return raw[0];
  return raw;
}
export default function OrderDetails() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = getParamId(rawId);
  useRealtimeOrder(id ?? '');

  const [stars, setStars] = useState(5);
  const [review, setReview] = useState('');
  const [rated, setRated] = useState(false);

  const order = useQuery({ queryKey: ['order', id], queryFn: () => getOrder(id!), enabled: Boolean(id) });
  const logs = useQuery({
    queryKey: ['status-logs', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('order_status_logs').select('*').eq('order_id', id!).order('created_at');
      if (error) throw error;
      return data;
    },
    enabled: Boolean(id),
  });

  const proofs = useQuery({
    queryKey: ['delivery-proofs', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('delivery_proofs').select('*').eq('order_id', id!).order('created_at');
      if (error) throw error;
      return data as { id: string; proof_type: string; photo_path: string; latitude: number; longitude: number; created_at: string }[];
    },
    enabled: Boolean(id),
  });

  const transition = useMutation({
    mutationFn: ({ status, note }: { status: 'cancelled' | 'completed'; note: string }) => {
      if (!id) throw new Error('Order not found');
      return transitionOrder(id, status, note);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['order', id] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['orders', 'paged'] });
    },
  });

  const rating = useMutation({
    mutationFn: () => {
      if (!id) throw new Error('Order not found');
      const shopId = order.data?.laundry_shop_id;
      if (!shopId) throw new Error('Laundry partner not found for this order');
      return submitRating({ orderId: id, targetType: 'laundry_shop', targetId: shopId, stars, review });
    },
    onSuccess: () => setRated(true),
  });

  if (order.isLoading) return <LoadingState label="Opening live order…" />;
  if (order.isError || !order.data) return <ErrorState message="This order could not be loaded." retry={() => void order.refetch()} />;

  const value = order.data;
  const canCancel = ['pending', 'laundry_confirmation'].includes(value.status);
  const pickupDateRaw = (() => {
    try {
      const d = new Date(`${value.pickup_date}T${value.pickup_time}`);
      if (Number.isNaN(d.valueOf())) return `${value.pickup_date} ${value.pickup_time}`;
      return d.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return `${value.pickup_date} ${value.pickup_time}`;
    }
  })();

  return (
    <Screen refreshing={order.isFetching} onRefresh={() => void order.refetch()}>
      <Title eyebrow={value.order_number}>Order tracking</Title>
      <Badge tone={orderStatusTone(value.status)}>{orderStatusLabel(value.status)}</Badge>

      {value.pickup_address && value.laundry_shop ? (
        <TrackingMap
          pickup={{ latitude: value.pickup_address.latitude, longitude: value.pickup_address.longitude }}
          laundry={{ latitude: value.laundry_shop.latitude, longitude: value.laundry_shop.longitude }}
        />
      ) : null}

      <Card>
        <Text style={ui.h2}>{value.laundry_shop?.name ?? 'Laundry partner'}</Text>
        <Text style={ui.body}>{pickupDateRaw}</Text>
        {value.order_items?.map((item) => (
          <View key={item.id} style={ui.between}>
            <Text style={ui.body}>
              {item.service?.name} · {item.quantity} kg
            </Text>
            <Text style={ui.body}>₱{item.subtotal.toFixed(2)}</Text>
          </View>
        ))}
        <View style={ui.divider} />
        <View style={ui.between}>
          <Text style={ui.h2}>Estimated total</Text>
          <Text style={ui.price}>₱{value.total_amount.toFixed(2)}</Text>
        </View>
        <Text style={ui.caption}>
          Laundry ₱{value.laundry_subtotal.toFixed(2)} · Pickup ₱{value.pickup_delivery_fee.toFixed(2)} · Return ₱{value.return_delivery_fee.toFixed(2)} · Platform
          ₱{value.platform_fee.toFixed(2)}
        </Text>
        {value.special_instructions ? (
          <>
            <View style={ui.divider} />
            <Text style={ui.caption}>SPECIAL INSTRUCTIONS</Text>
            <Text style={ui.body}>{value.special_instructions}</Text>
          </>
        ) : null}
      </Card>

      {canCancel ? (
        <Button
          variant="danger"
          loading={transition.isPending}
          onPress={() =>
            Alert.alert('Cancel this booking?', 'The laundry partner will no longer be able to accept it.', [
              { text: 'Keep booking', style: 'cancel' },
              { text: 'Cancel booking', style: 'destructive', onPress: () => transition.mutate({ status: 'cancelled', note: 'Cancelled by customer' }) },
            ])
          }
        >
          Cancel booking
        </Button>
      ) : null}

      {value.status === 'delivered' ? (
        <Card>
          <Text style={ui.h2}>Did you receive your laundry?</Text>
          <Text style={ui.body}>Confirm only after checking the returned items.</Text>
          <Button
            loading={transition.isPending}
            onPress={() =>
              Alert.alert('Complete order?', 'This confirms that the laundry was returned to you.', [
                { text: 'Not yet', style: 'cancel' },
                { text: 'Confirm received', onPress: () => transition.mutate({ status: 'completed', note: 'Confirmed received by customer' }) },
              ])
            }
          >
            Confirm received
          </Button>
        </Card>
      ) : null}

      {value.status === 'completed' && !rated ? (
        <Card>
          <Text style={ui.h2}>Rate {value.laundry_shop?.name ?? 'this partner'}</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((number) => (
              <Pressable
                key={number}
                accessibilityRole="radio"
                accessibilityLabel={`${number} stars`}
                accessibilityState={{ checked: stars === number }}
                onPress={() => setStars(number)}
              >
                <Text style={[styles.star, number <= stars && styles.starSelected]}>★</Text>
              </Pressable>
            ))}
          </View>
          <Field label="Review (optional)" value={review} onChangeText={setReview} maxLength={1000} multiline placeholder="Tell us about the service" />
          {rating.error ? <Text style={styles.error}>{friendlyError(rating.error)}</Text> : null}
          <Button loading={rating.isPending} onPress={() => rating.mutate()}>
            Submit rating
          </Button>
        </Card>
      ) : null}

      {rated ? (
        <Card>
          <Text style={ui.h2}>Thanks for your feedback</Text>
          <Text style={ui.body}>Your rating has been recorded and helps other customers.</Text>
        </Card>
      ) : null}

      {transition.error ? <Text style={styles.error}>{friendlyError(transition.error)}</Text> : null}

      <Text style={ui.h2}>Proof photos</Text>
      {proofs.isLoading ? (
        <Text style={ui.body}>Loading proofs…</Text>
      ) : proofs.data?.length ? (
        proofs.data.map((proof) => (
          <ProofCard key={proof.id} proof={proof} />
        ))
      ) : (
        <Text style={ui.body}>No proofs yet. Rider will attach photo + GPS at pickup and delivery.</Text>
      )}

      <Text style={ui.h2}>Handoff timeline</Text>
      {logs.data?.length ? (
        logs.data.map((log) => (
          <View key={log.id} style={ui.row}>
            <Text style={styles.dot}>●</Text>
            <View style={ui.flex}>
              <Text style={styles.logTitle}>{orderStatusLabel(log.to_status)}</Text>
              <Text style={ui.caption}>{new Date(String(log.created_at)).toLocaleString()}</Text>
              {log.note ? <Text style={ui.body}>{log.note}</Text> : null}
            </View>
          </View>
        ))
      ) : (
        <Text style={ui.body}>Updates will appear here as your order moves.</Text>
      )}

      {id ? <OrderChat orderId={id} /> : null}
    </Screen>
  );
}

function ProofCard({ proof }: { proof: { id: string; proof_type: string; photo_path: string; latitude: number; longitude: number; created_at: string } }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    supabase.storage.from('delivery-proofs').createSignedUrl(proof.photo_path, 3600).then(({ data }) => {
      if (active && data?.signedUrl) setSignedUrl(data.signedUrl);
    }).catch(() => {});
    return () => { active = false; };
  }, [proof.photo_path]);
  return (
    <Card>
      <View style={ui.between}>
        <Text style={ui.h2}>{proof.proof_type === 'pickup' ? 'Pickup proof' : 'Delivery proof'}</Text>
        <Text style={ui.caption}>{new Date(proof.created_at).toLocaleString('en-PH')}</Text>
      </View>
      {signedUrl ? <Image source={{ uri: signedUrl }} style={styles.proofImage} contentFit="cover" transition={200} /> : <Text style={ui.caption}>📷 {proof.photo_path}</Text>}
      <Text style={ui.caption}>Location {proof.latitude.toFixed(5)}, {proof.longitude.toFixed(5)}</Text>
      <Text style={ui.caption}>Private proof — visible only to order participants (RLS).</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  stars: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
  star: { fontSize: 36, color: colors.line },
  starSelected: { color: colors.amber },
  error: { color: colors.red, fontSize: 13, fontWeight: '600' },
  dot: { color: colors.blue, fontSize: 12, marginTop: 2 },
  logTitle: { fontWeight: '700', color: colors.ink },
  proofImage: { height: 180, borderRadius: 12, backgroundColor: '#EBF0F5', marginTop: 8 },
});
