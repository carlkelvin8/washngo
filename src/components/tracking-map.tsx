import MapView, { Marker } from 'react-native-maps';
import { Platform, StyleSheet, View } from 'react-native';
import { useEffect, useMemo, useRef } from 'react';

import { colors } from '@/constants/design';

type LatLng = { latitude: number | string; longitude: number | string };

function toNum(v: number | string): number {
  return typeof v === 'string' ? Number(v) : v;
}

function isValidCoord(c: LatLng | undefined): c is LatLng {
  if (!c) return false;
  const lat = toNum(c.latitude);
  const lng = toNum(c.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
}

function coerce(c: LatLng): { latitude: number; longitude: number } {
  return { latitude: toNum(c.latitude), longitude: toNum(c.longitude) };
}

export function TrackingMap({
  pickup,
  laundry,
  rider,
}: {
  pickup: LatLng;
  laundry: LatLng;
  rider?: LatLng;
}) {
  const safePickup = useMemo(() => (isValidCoord(pickup) ? coerce(pickup) : { latitude: 13.941, longitude: 121.163 }), [pickup]);
  const safeLaundry = useMemo(() => (isValidCoord(laundry) ? coerce(laundry) : safePickup), [laundry, safePickup]);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    const raw = [safePickup, safeLaundry, rider].filter((c): c is LatLng => isValidCoord(c));
    const coords = raw.map(coerce);
    if (coords.length < 2) return;
    const id = setTimeout(() => {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 40, bottom: 40, left: 40, right: 40 },
        animated: true,
      });
    }, 300);
    return () => clearTimeout(id);
  }, [safePickup, safeLaundry, rider]);

  useEffect(() => {
    if (!isValidCoord(rider)) return;
    mapRef.current?.animateToRegion({ ...coerce(rider), latitudeDelta: 0.02, longitudeDelta: 0.02 }, 600);
  }, [rider]);

  // The react-native-maps plugin (Google key) is only included when
  // EXPO_PUBLIC_GOOGLE_MAPS_API_KEY exists — forcing the Google provider
  // without it renders a blank map with no error. Fall back to default.
  const useGoogleProvider =
    Platform.OS === 'android' && Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY);

  return (
    <View style={styles.frame}>
      {/* Android overflow:hidden doesn't clip MapView — outer view clips, inner view draws */}
      <View style={styles.clip}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={{ ...safePickup, latitudeDelta: 0.06, longitudeDelta: 0.06 }}
          loadingEnabled
          showsUserLocation={false}
          {...(useGoogleProvider ? { provider: 'google' as unknown as undefined } : {})}
        >
          <Marker coordinate={safePickup} title="Pickup address" pinColor={colors.blue} />
          <Marker coordinate={safeLaundry} title="Laundry partner" pinColor={colors.green} />
          {isValidCoord(rider) ? <Marker coordinate={coerce(rider)} title="Your rider" pinColor={colors.navy} /> : null}
        </MapView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: 260, borderRadius: 18, backgroundColor: '#D9E2EC' },
  clip: { flex: 1, borderRadius: 18, overflow: 'hidden' },
});
