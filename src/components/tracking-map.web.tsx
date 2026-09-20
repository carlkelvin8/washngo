import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, space } from '@/constants/design';

type LatLng = { latitude: number; longitude: number };

export function TrackingMap(_props?: { pickup?: LatLng; laundry?: LatLng; rider?: LatLng }) {
  return (
    <View style={styles.frame}>
      <Text style={styles.title}>Live map</Text>
      <Text style={styles.text}>Available in the iOS and Android app with rider GPS and proof photos.</Text>
      <Text style={styles.caption}>Order timeline and status remain live on web.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 180,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blueSoft,
    padding: space.xl,
    gap: space.sm,
    borderWidth: 1,
    borderColor: '#B8D7FF',
  },
  title: { color: colors.navy, fontWeight: '800', fontSize: 16 },
  text: { color: colors.ink, textAlign: 'center', fontWeight: '600', lineHeight: 20 },
  caption: { color: colors.muted, fontSize: 12, textAlign: 'center' },
});
