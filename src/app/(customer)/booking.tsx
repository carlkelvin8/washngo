import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field, LoadingState, Screen, Title, ui } from '@/components/ui';
import { DateTimeField } from '@/components/date-time-field';
import { listAddresses } from '@/services/address.service';
import { getLaundryShop } from '@/services/laundry.service';
import { createBooking } from '@/services/order.service';
import { bookingSchema } from '@/features/booking/schema';
import { useBookingStore } from '@/store/booking.store';
import { friendlyError } from '@/lib/errors';
import { colors, radius, space } from '@/constants/design';

function initialPickup(draftDate?: string, draftTime?: string) { const fallback = new Date(Date.now() + 86400000); fallback.setHours(9, 0, 0, 0); if (!draftDate || !draftTime) return fallback; const parsed = new Date(`${draftDate}T${draftTime}:00`); return Number.isNaN(parsed.valueOf()) ? fallback : parsed; }
function datePart(value: Date) { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`; }
function timePart(value: Date) { return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`; }

export default function Booking() {
  const router = useRouter(); const draft = useBookingStore();
  const [addressId, setAddressId] = useState(draft.addressId ?? ''); const [pickup, setPickup] = useState(() => initialPickup(draft.pickupDate, draft.pickupTime));
  const [weight, setWeight] = useState(String(draft.estimatedWeight)); const [instructions, setInstructions] = useState(draft.specialInstructions);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'pay_later'>(draft.paymentMethod); const [errors, setErrors] = useState<Record<string, string>>({});
  const addresses = useQuery({ queryKey: ['addresses'], queryFn: listAddresses });
  const shop = useQuery({ queryKey: ['laundry', draft.shopId], queryFn: () => getLaundryShop(draft.shopId!), enabled: Boolean(draft.shopId) });
  const service = shop.data?.services?.find((item) => item.id === draft.serviceId);
  const estimate = useMemo(() => { if (!service) return null; const kg = Number(weight); if (!Number.isFinite(kg) || kg <= 0) return null; const laundry = Math.max(service.minimum_charge, service.pricing_type === 'per_kg' ? service.price * kg : service.price); const platform = Math.round(laundry * 5) / 100; return { laundry, platform, total: laundry + 138 + platform }; }, [service, weight]);
  const mutation = useMutation({ mutationFn: createBooking, onSuccess: (order) => { draft.reset(); router.replace(`/(customer)/orders/${order.id}`); } });
  if (!draft.shopId || !draft.serviceId) return <Screen><Title>Start with a laundry</Title><Button onPress={() => router.replace('/(customer)/laundries')}>Browse partners</Button></Screen>;
  if (addresses.isLoading || shop.isLoading) return <LoadingState label="Preparing your booking…" />;
  const submit = () => { const input = { shopId: draft.shopId!, serviceId: draft.serviceId!, addressId, pickupDate: datePart(pickup), pickupTime: timePart(pickup), estimatedWeight: Number(weight), specialInstructions: instructions, paymentMethod }; const result = bookingSchema.safeParse(input); if (!result.success) { const next: Record<string, string> = {}; for (const issue of result.error.issues) next[String(issue.path[0])] ??= issue.message; setErrors(next); return; } setErrors({}); mutation.mutate(input); };
  return <Screen>
    <Title eyebrow="Review before confirming">Schedule pickup</Title><Text style={ui.h2}>Pickup address</Text>
    {addresses.data?.map((address) => <Card key={address.id} onPress={() => { setAddressId(address.id); setErrors((old) => ({ ...old, addressId: '' })); }}><View style={ui.between}><View style={ui.flex}><Text style={ui.h2}>{address.label}</Text><Text style={ui.body}>{address.full_address}, Brgy. {address.barangay}</Text></View><Text style={styles.radio}>{addressId === address.id ? '●' : '○'}</Text></View></Card>)}
    {errors.addressId ? <Text style={styles.error}>{errors.addressId}</Text> : null}<Button variant="secondary" onPress={() => router.push('/(customer)/addresses')}>Add another address</Button>
    <DateTimeField label="Pickup date" mode="date" value={pickup} minimumDate={new Date()} error={errors.pickupDate} onChange={(date) => { const next = new Date(pickup); next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate()); setPickup(next); setErrors((old) => ({ ...old, pickupDate: '' })); }} />
    <DateTimeField label="Pickup time" mode="time" value={pickup} error={errors.pickupTime} onChange={(time) => { const next = new Date(pickup); next.setHours(time.getHours(), time.getMinutes(), 0, 0); setPickup(next); setErrors((old) => ({ ...old, pickupTime: '', pickupDate: '' })); }} />
    <Field label="Estimated weight in kg" value={weight} error={errors.estimatedWeight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="Example 3" />
    <Field label="Special instructions optional" value={instructions} error={errors.specialInstructions} onChangeText={setInstructions} multiline maxLength={500} placeholder="Fabric care, stains, pickup notes…" />
    <Text style={ui.h2}>Payment</Text><View style={styles.options}>{(['cod', 'pay_later'] as const).map((method) => <Pressable key={method} accessibilityRole="radio" accessibilityState={{ checked: paymentMethod === method }} onPress={() => setPaymentMethod(method)} style={[styles.option, paymentMethod === method && styles.optionSelected]}><Text style={styles.optionTitle}>{method === 'cod' ? 'Cash on delivery' : 'Pay later'}</Text><Text style={ui.caption}>{method === 'cod' ? 'Pay when the order returns' : 'Recorded as an unpaid balance'}</Text></Pressable>)}</View>
    <Card><Text style={ui.h2}>Estimated total</Text>{estimate ? <><View style={ui.between}><Text style={ui.body}>Laundry service</Text><Text>₱{estimate.laundry.toFixed(2)}</Text></View><View style={ui.between}><Text style={ui.body}>Pickup and return</Text><Text>₱138.00</Text></View><View style={ui.between}><Text style={ui.body}>Platform fee</Text><Text>₱{estimate.platform.toFixed(2)}</Text></View><View style={ui.divider} /><View style={ui.between}><Text style={ui.h2}>Total</Text><Text style={ui.price}>₱{estimate.total.toFixed(2)}</Text></View></> : <Text style={ui.body}>Enter a valid weight to see the estimate.</Text>}<Text style={ui.caption}>The server verifies the final stored amount when you confirm.</Text></Card>
    {mutation.error ? <Text style={styles.error}>{friendlyError(mutation.error)}</Text> : null}<Button loading={mutation.isPending} onPress={submit}>Confirm booking</Button>
  </Screen>;
}
const styles = StyleSheet.create({ radio: { color: colors.blue, fontSize: 24 }, error: { color: colors.red, fontSize: 13 }, options: { flexDirection: 'row', gap: space.md }, option: { flex: 1, minHeight: 84, padding: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, gap: space.xs }, optionSelected: { borderColor: colors.blue, backgroundColor: colors.blueSoft }, optionTitle: { color: colors.ink, fontWeight: '800' } });
