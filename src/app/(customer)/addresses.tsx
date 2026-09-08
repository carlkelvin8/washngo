import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { Button, Card, EmptyState, Field, LoadingState, Screen, Title, ui } from '@/components/ui';
import { createAddress, listAddresses, removeAddress } from '@/services/address.service';
import { addressSchema } from '@/features/address/schema';
import { queryClient } from '@/lib/query-client';
import { friendlyError } from '@/lib/errors';
import { colors } from '@/constants/design';

const emptyForm = { label: 'Home', full_address: '', barangay: '', latitude: 0, longitude: 0 };
export default function Addresses() {
  const [show, setShow] = useState(false); const [form, setForm] = useState(emptyForm); const [locating, setLocating] = useState(false); const [message, setMessage] = useState(''); const [errors, setErrors] = useState<Record<string, string>>({});
  const query = useQuery({ queryKey: ['addresses'], queryFn: listAddresses });
  const create = useMutation({ mutationFn: createAddress, onSuccess: async () => { setShow(false); setForm(emptyForm); setMessage(''); await queryClient.invalidateQueries({ queryKey: ['addresses'] }); } });
  const remove = useMutation({ mutationFn: removeAddress, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }) });
  const captureCurrentLocation = async () => {
    setLocating(true); setMessage('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) { setMessage('Location access is off. Enable it in Settings, then try again.'); return; }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      let address = null; try { address = (await Location.reverseGeocodeAsync(position.coords))[0] ?? null; } catch { /* Coordinates are still useful if geocoding is unavailable. */ }
      setForm((old) => ({ ...old, latitude: position.coords.latitude, longitude: position.coords.longitude, full_address: old.full_address || [address?.streetNumber, address?.street, address?.district].filter(Boolean).join(' '), barangay: old.barangay || address?.district || address?.subregion || '' }));
      setMessage('Pickup pin captured. Review the written address before saving.');
    } catch (error) { setMessage(friendlyError(error)); } finally { setLocating(false); }
  };
  const save = () => {
    const result = addressSchema.safeParse(form); if (!result.success) { const next: Record<string, string> = {}; for (const issue of result.error.issues) next[String(issue.path[0])] ??= issue.message; if (!form.latitude || !form.longitude) next.location = 'Capture your pickup pin first.'; setErrors(next); return; }
    if (!form.latitude || !form.longitude) { setErrors({ location: 'Capture your pickup pin first.' }); return; }
    setErrors({}); create.mutate({ ...result.data, city: 'Lipa City', province: 'Batangas', is_default: !query.data?.length });
  };
  if (query.isLoading) return <LoadingState />;
  return <Screen><Title>Saved addresses</Title>
    {query.data?.length ? query.data.map((address) => <Card key={address.id}><View style={ui.between}><View style={ui.flex}><Text style={ui.h2}>{address.label}{address.is_default ? ' · Default' : ''}</Text><Text style={ui.body}>{address.full_address}, Brgy. {address.barangay}</Text></View></View><Button variant="secondary" loading={remove.isPending} onPress={() => Alert.alert('Remove address?', 'Existing orders will keep their stored pickup details.', [{ text: 'Keep address', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => remove.mutate(address.id) }])}>Remove</Button></Card>) : <EmptyState title="No pickup address yet" message="Add a precise Lipa City address to book your first pickup." />}
    {show ? <Card><Field label="Label" value={form.label} error={errors.label} onChangeText={(value) => setForm((old) => ({ ...old, label: value }))} placeholder="Home, Office…" /><Field label="Full address" value={form.full_address} error={errors.full_address} onChangeText={(value) => setForm((old) => ({ ...old, full_address: value }))} multiline placeholder="House number, street, subdivision" /><Field label="Barangay" value={form.barangay} error={errors.barangay} onChangeText={(value) => setForm((old) => ({ ...old, barangay: value }))} /><Button variant="secondary" loading={locating} onPress={() => void captureCurrentLocation()}>{form.latitude ? 'Update pickup pin' : 'Use my current location'}</Button>{form.latitude ? <Text style={ui.caption}>Pin: {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}</Text> : null}{errors.location ? <Text style={styles.error}>{errors.location}</Text> : null}{message ? <Text style={styles.message}>{message}</Text> : null}{message.includes('Settings') ? <Button variant="secondary" onPress={() => void Linking.openSettings()}>Open Settings</Button> : null}{create.error ? <Text style={styles.error}>{friendlyError(create.error)}</Text> : null}<Button loading={create.isPending} onPress={save}>Save address</Button><Button variant="secondary" onPress={() => { setShow(false); setErrors({}); setMessage(''); }}>Cancel</Button></Card> : <Button onPress={() => setShow(true)}>Add address</Button>}
  </Screen>;
}
const styles = StyleSheet.create({ error: { color: colors.red, fontSize: 13 }, message: { color: colors.muted, fontSize: 13, lineHeight: 19 } });
