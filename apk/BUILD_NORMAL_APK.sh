#!/bin/bash
# Normal APK generation WITHOUT Expo cloud (bare React Native)
# Already prebuilt via: npx expo prebuild --platform android --clean
# SDK: /opt/homebrew/share/android-commandlinetools (build-tools 34/35/36 ready)

set -e
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export ANDROID_SDK_ROOT=$ANDROID_HOME
export PATH=$ANDROID_HOME/platform-tools:$PATH

echo "▶ Building WashNgo debug APK (normal, no Expo cloud)..."
echo "  ANDROID_HOME=$ANDROID_HOME"
echo "  First build ~10-15 mins (downloads Gradle + bundles JS)"

./android/gradlew -p android assembleDebug --no-daemon

if [ -f android/app/build/outputs/apk/debug/app-debug.apk ]; then
  cp android/app/build/outputs/apk/debug/app-debug.apk apk/washngo-debug.apk
  echo "✅ APK ready: apk/washngo-debug.apk"
  ls -lh apk/*.apk
  echo "Install: adb install apk/washngo-debug.apk"
else
  echo "❌ Build failed — check android/app/build/outputs"
  exit 1
fi
