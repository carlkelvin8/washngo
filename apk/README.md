# WashNgo APK

> **Status:** Directory created. APK generation requires EAS setup.

## Required before build
1. `eas login` — log in to your Expo account (carlkelvin8)
2. Set `EXPO_PUBLIC_EAS_PROJECT_ID` in `.env` — create project via `eas init` or `eas build:configure`
3. `eas.json` preview profile with `distribution: store` or `apk` type: `android.buildType: apk`
4. Android SDK `build-tools` (currently missing on this Mac: `~/Library/Android/sdk/build-tools` not found)
   - Install via: `brew install android-commandlinetools` or Android Studio > SDK Manager > Build Tools 34+

## Commands to generate APK locally (once SDK ready)
```bash
npx expo prebuild --platform android --clean
./android/gradlew -p android assembleRelease
# output: android/app/build/outputs/apk/release/app-release.apk
cp android/app/build/outputs/apk/release/app-release.apk apk/washngo.apk
```

## Commands via EAS Cloud (recommended)
```bash
eas build:configure
# then in eas.json ensure:
# { "build": { "preview": { "distribution": "internal", "android": { "buildType": "apk" } } } }
eas build --platform android --profile preview --non-interactive
# download from https://expo.dev/accounts/carlkelvin8/projects/washngo/builds
```

Place the downloaded `*.apk` here: `washngo/apk/washngo.apk`
