import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import { AppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

export async function captureAndUploadProof(jobId: string, orderId: string, proofType: 'pickup' | 'delivery') {
  const camera = await ImagePicker.requestCameraPermissionsAsync();
  const locationPermission = await Location.requestForegroundPermissionsAsync();
  if (!camera.granted || !locationPermission.granted) {
    throw new AppError('Camera and location access are required. Enable both in Settings and try again.');
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.65,
    exif: false,
  });
  if (result.canceled) throw new AppError('No proof was submitted. Take a photo when you are ready.');

  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  let assetUri = result.assets[0].uri;
  let mimeType = result.assets[0].mimeType ?? 'image/jpeg';

  // First-principles: resize to 1280w to avoid 4MB heap + OOM on low-end Android
  try {
    const { manipulateAsync, SaveFormat } = await import('expo-image-manipulator');
    const manipulated = await manipulateAsync(assetUri, [{ resize: { width: 1280 } }], {
      compress: 0.65,
      format: SaveFormat.JPEG,
    });
    assetUri = manipulated.uri;
  } catch {
    // manipulator not available (web) — use original
  }

  // fetch() fails for ph:// on iOS; try FileSystem as fallback
  let blob: ArrayBuffer;
  try {
    const response = await fetch(assetUri);
    if (!response.ok) throw new Error(`fetch ${response.status}`);
    blob = await response.arrayBuffer();
  } catch {
    try {
      const { File } = await import('expo-file-system');
      const file = new File(assetUri);
      const bytes = await file.bytes();
      blob = bytes.buffer as ArrayBuffer;
    } catch {
      throw new AppError('The proof photo could not be read. Please retake it.');
    }
  }
  const path = `${orderId}/${jobId}/${Date.now()}.jpg`;

  const upload = await supabase.storage.from('delivery-proofs').upload(path, blob, {
    contentType: mimeType,
    upsert: false,
    cacheControl: '3600',
  });
  if (upload.error) throw new AppError('Unable to upload proof. Check your connection and try again.', upload.error);

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    await supabase.storage.from('delivery-proofs').remove([path]);
    throw new AppError('Please sign in again.');
  }

  const { error } = await supabase.from('delivery_proofs').insert({
    delivery_job_id: jobId,
    order_id: orderId,
    proof_type: proofType,
    photo_path: path,
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    captured_by: auth.user.id,
  });

  if (error) {
    await supabase.storage.from('delivery-proofs').remove([path]);
    throw new AppError('The handoff could not be recorded. Please try again.', error);
  }

  return path;
}
