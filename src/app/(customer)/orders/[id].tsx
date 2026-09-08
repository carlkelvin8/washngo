import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, Button, Card, ErrorState, Field, LoadingState, Screen, Title, ui } from '@/components/ui';
import { TrackingMap } from '@/components/tracking-map';
import { getOrder, transitionOrder } from '@/services/order.service';
import { submitRating } from '@/services/rating.service';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/query-client';
import { friendlyError } from '@/lib/errors';
import { orderStatusLabel, orderStatusTone } from '@/lib/order-status';
import { useRealtimeOrder } from '@/hooks/use-realtime-order';
import { colors } from '@/constants/design';

export default function OrderDetails() {
  const { id } = useLocalSearchParams<{ id: string }>(); useRealtimeOrder(id); const [stars, setStars] = useState(5); const [review, setReview] = useState(''); const [rated, setRated] = useState(false);
  const order = useQuery({ queryKey: ['order', id], queryFn: () => getOrder(id) });
  const logs = useQuery({ queryKey: ['status-logs', id], queryFn: async () => { const { data, error } = await supabase.from('order_status_logs').select('*').eq('order_id', id).order('created_at'); if (error) throw error; return data; } });
  const transition = useMutation({ mutationFn: ({ status, note }: { status: 'cancelled' | 'completed'; note: string }) => transitionOrder(id, status, note), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['order', id] }); await queryClient.invalidateQueries({ queryKey: ['orders'] }); } });
  const rating = useMutation({ mutationFn: () => submitRating({ orderId: id, targetType: 'laundry_shop', targetId: order.data!.laundry_shop_id, stars, review }), onSuccess: () => setRated(true) });
  if (order.isLoading) return <LoadingState label="Opening live order…" />;
  if (order.isError || !order.data) return <ErrorState message="This order could not be loaded." retry={() => void order.refetch()} />;
  const value = order.data; const canCancel = ['pending', 'laundry_confirmation'].includes(value.status);
  return <Screen><Title eyebrow={value.order_number}>Order tracking</Title><Badge tone={orderStatusTone(value.status)}>{orderStatusLabel(value.status)}</Badge>
    {value.pickup_address && value.laundry_shop ? <TrackingMap pickup={{ latitude: value.pickup_address.latitude, longitude: value.pickup_address.longitude }} laundry={{ latitude: value.laundry_shop.latitude, longitude: value.laundry_shop.longitude }} /> : null}
    <Card><Text style={ui.h2}>{value.laundry_shop?.name}</Text><Text style={ui.body}>{new Date(`${value.pickup_date}T${value.pickup_time}`).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</Text>{value.order_items?.map((item) => <View key={item.id} style={ui.between}><Text>{item.service?.name} · {item.quantity} kg</Text><Text>₱{item.subtotal.toFixed(2)}</Text></View>)}<View style={ui.divider} /><View style={ui.between}><Text style={ui.h2}>Estimated total</Text><Text style={ui.price}>₱{value.total_amount.toFixed(2)}</Text></View><Text style={ui.caption}>Laundry ₱{value.laundry_subtotal.toFixed(2)} · Pickup ₱{value.pickup_delivery_fee.toFixed(2)} · Return ₱{value.return_delivery_fee.toFixed(2)} · Platform ₱{value.platform_fee.toFixed(2)}</Text>{value.special_instructions ? <><View style={ui.divider} /><Text style={ui.caption}>SPECIAL INSTRUCTIONS</Text><Text style={ui.body}>{value.special_instructions}</Text></> : null}</Card>
    {canCancel ? <Button variant="danger" loading={transition.isPending} onPress={() => Alert.alert('Cancel this booking?', 'The laundry partner will no longer be able to accept it.', [{ text: 'Keep booking', style: 'cancel' }, { text: 'Cancel booking', style: 'destructive', onPress: () => transition.mutate({ status: 'cancelled', note: 'Cancelled by customer' }) }])}>Cancel booking</Button> : null}
    {value.status === 'delivered' ? <Card><Text style={ui.h2}>Did you receive your laundry?</Text><Text style={ui.body}>Confirm only after checking the returned items.</Text><Button loading={transition.isPending} onPress={() => Alert.alert('Complete order?', 'This confirms that the laundry was returned to you.', [{ text: 'Not yet', style: 'cancel' }, { text: 'Confirm received', onPress: () => transition.mutate({ status: 'completed', note: 'Confirmed received by customer' }) }])}>Confirm received</Button></Card> : null}
    {value.status === 'completed' && !rated ? <Card><Text style={ui.h2}>Rate {value.laundry_shop?.name}</Text><View style={styles.stars}>{[1,2,3,4,5].map((number) => <Pressable key={number} accessibilityRole="radio" accessibilityLabel={`${number} stars`} accessibilityState={{ checked: stars === number }} onPress={() => setStars(number)}><Text style={[styles.star, number <= stars && styles.starSelected]}>★</Text></Pressable>)}</View><Field label="Review optional" value={review} onChangeText={setReview} maxLength={1000} multiline placeholder="Tell us about the service" />{rating.error ? <Text style={styles.error}>{friendlyError(rating.error)}</Text> : null}<Button loading={rating.isPending} onPress={() => rating.mutate()}>Submit rating</Button></Card> : null}
    {rated ? <Card><Text style={ui.h2}>Thanks for your feedback</Text><Text style={ui.body}>Your rating has been recorded.</Text></Card> : null}
    {transition.error ? <Text style={styles.error}>{friendlyError(transition.error)}</Text> : null}
    <Text style={ui.h2}>Handoff timeline</Text>{logs.data?.map((log) => <View key={log.id} style={ui.row}><Text style={styles.dot}>●</Text><View style={ui.flex}><Text style={styles.logTitle}>{orderStatusLabel(log.to_status)}</Text><Text style={ui.caption}>{new Date(String(log.created_at)).toLocaleString()}</Text>{log.note ? <Text style={ui.body}>{log.note}</Text> : null}</View></View>)}
  </Screen>;
}
const styles = StyleSheet.create({ stars: { flexDirection: 'row', justifyContent: 'space-between' }, star: { fontSize: 36, color: colors.line }, starSelected: { color: colors.amber }, error: { color: colors.red, fontSize: 13 }, dot: { color: colors.blue }, logTitle: { fontWeight: '700', color: colors.ink } });
