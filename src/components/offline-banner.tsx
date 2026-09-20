import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, space } from '@/constants/design';
import { useNetworkStatus } from '@/hooks/use-network-status';

export function OfflineBanner() {
  const { isOffline } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  if (!isOffline) return null;
  return (
    <View style={[styles.banner, { paddingTop: Math.max(8, insets.top + 4) }]} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Text style={styles.text}>You are offline — bookings and live updates will resume when reconnected.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FFF5E6',
    borderBottomWidth: 1,
    borderColor: '#FFD8A8',
    borderStyle: 'solid' as const,
    paddingVertical: 8,
    paddingHorizontal: space.lg,
  },
  text: { color: colors.ink, fontSize: 12, fontWeight: '700', textAlign: 'center' },
});
