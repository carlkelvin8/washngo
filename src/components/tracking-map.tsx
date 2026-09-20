import MapView, { Marker } from 'react-native-maps';
import { Platform, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/design';

type LatLng = { latitude: number; longitude: number };

function isValidCoord(c: LatLng | undefined): c is LatLng {
  return !!c && Number.isFinite(c.latitude) && Number.isFinite(c.longitude) && !(c.latitude === 0 && c.longitude === 0);
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
  const safePickup = isValidCoord(pickup) ? pickup : { latitude: 13.941, longitude: 121.163 };
  const safeLaundry = isValidCoord(laundry) ? laundry : safePickup;

  return (
    <View style={styles.frame}>
      {/* Android overflow:hidden doesn't clip MapView — outer view clips, inner view draws */}
      <View style={styles.clip}>
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={{ ...safePickup, latitudeDelta: 0.06, longitudeDelta: 0.06 }}
          loadingEnabled
          showsUserLocation={false}
          {...(Platform.OS === 'android' ? { provider: 'google' as unknown as undefined } : {})}
        >
          <Marker coordinate={safePickup} title="Pickup address" pinColor={colors.blue} />
          <Marker coordinate={safeLaundry} title="Laundry partner" pinColor={colors.green} />
          {isValidCoord(rider) ? <Marker coordinate={rider} title="Your rider" pinColor={colors.navy} /> : null}
        </MapView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: 260, borderRadius: 18, backgroundColor: '#D9E2EC' },
  clip: { flex: 1, borderRadius: 18, overflow: 'hidden' },
});
