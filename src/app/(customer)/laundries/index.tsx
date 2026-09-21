import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, EmptyState, ErrorState, Field, LoadingState, Screen, Title, ui } from '@/components/ui';
import { listLaundryShops } from '@/services/laundry.service';
import { colors, radius, space } from '@/constants/design';

type SortKey = 'rating' | 'price_low' | 'price_high';

export default function Laundries() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sort, setSort] = useState<SortKey>('rating');

  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const query = useQuery({ queryKey: ['laundries', debounced], queryFn: () => listLaundryShops(debounced) });

  const handleSearch = (value: string) => {
    setSearch(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebounced(value.trim()), 320);
  };

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const sorted = useMemo(() => {
    if (!query.data) return [];
    const copy = [...query.data];
    if (sort === 'rating') copy.sort((a, b) => Number(b.average_rating) - Number(a.average_rating));
    if (sort === 'price_low' || sort === 'price_high') {
      const cheapest = (s: (typeof copy)[number]) =>
        s.services?.length ? Math.min(...s.services.map((x) => Number(x.minimum_charge ?? x.price))) : Infinity;
      copy.sort((a, b) => (sort === 'price_low' ? cheapest(a) - cheapest(b) : cheapest(b) - cheapest(a)));
    }
    return copy;
  }, [query.data, sort]);

  if (query.isLoading) return <LoadingState label="Loading partners…" />;

  return (
    <Screen refreshing={query.isFetching} onRefresh={() => void query.refetch()}>
      <Title eyebrow="Lipa City">Laundry partners</Title>
      <Field label="Search" placeholder="Shop or service" value={search} onChangeText={handleSearch} autoCapitalize="none" />

      <View style={styles.filters}>
        {(['rating', 'price_low', 'price_high'] as const).map((key) => (
          <Pressable
            key={key}
            onPress={() => setSort(key)}
            style={[styles.chip, sort === key && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: sort === key }}
          >
            <Text style={[styles.chipText, sort === key && styles.chipTextActive]}>
              {key === 'rating' ? 'Top rated' : key === 'price_low' ? 'Price ↑' : 'Price ↓'}
            </Text>
          </Pressable>
        ))}
      </View>

      {query.isError ? (
        <ErrorState message="Partners are unavailable right now." retry={() => void query.refetch()} />
      ) : !sorted.length ? (
        <EmptyState
          title={debounced ? 'No matches' : 'No partners yet'}
          message={debounced ? 'Try a different shop name or clear your search.' : 'Verified partners will appear here soon.'}
        />
      ) : (
        sorted.map((shop) => {
          const cheapest = shop.services?.length ? Math.min(...shop.services.map((s) => Number(s.minimum_charge ?? s.price))) : null;
          return (
            <Card key={shop.id} onPress={() => router.push(`/(customer)/laundries/${shop.id}`)}>
              <View style={ui.between}>
                <Text style={ui.h2}>{shop.name}</Text>
                <Text>★ {Number(shop.average_rating).toFixed(1)}</Text>
              </View>
              <Text style={ui.body}>{shop.address}</Text>
              {cheapest !== null ? <Text style={ui.price}>From ₱{Number(cheapest).toFixed(0)}</Text> : null}
              <Text style={ui.caption}>{shop.is_verified ? 'Verified partner' : 'Verification pending'} · {shop.services?.filter((s) => s.is_active).length ?? 0} services</Text>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: space.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  chipActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.ink },
  chipTextActive: { color: colors.white },
});
