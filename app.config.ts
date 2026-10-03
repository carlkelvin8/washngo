import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'WashNgo',
  slug: 'washngo',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'washngo',
  userInterfaceStyle: 'light',
  ios: {
    icon: './assets/images/icon.png',
    bundleIdentifier: 'ph.washngo.app',
    infoPlist: {
      NSLocationWhenInUseUsageDescription: 'WashNgo uses your location for accurate pickups and live delivery tracking.',
      NSCameraUsageDescription: 'WashNgo uses the camera for pickup and delivery proof photos.',
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    package: 'ph.washngo.app',
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'CAMERA', 'POST_NOTIFICATIONS'],
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  // EAS sets EAS_PROJECT_ID at build time — exposes it to the runtime
  // fallback in notification.service (EXPO_PUBLIC_EAS_PROJECT_ID wins).
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-location',
    'expo-notifications',
    'expo-image-picker',
    ['expo-splash-screen', { backgroundColor: '#208AEF', image: './assets/images/splash-icon.png', imageWidth: 76 }],
    '@react-native-community/datetimepicker',
    ...(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
      ? [['react-native-maps' as const, { googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY }] as const]
      : []),
  ] as ExpoConfig['plugins'],
  experiments: { typedRoutes: true, reactCompiler: true },
};

export default config;
