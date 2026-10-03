import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import { AppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

// Idempotency probe: a prior attempt may have uploaded the proof but failed
// the job transition (timeout/crash) — reusing it avoids duplicate photos,
// duplicate storage objects, and duplicate proof rows on retry.
export async function getProofForJob(jobId: string, proofType: 'pickup' | 'delivery') {
  const { data, error } = await supabase
    .from('delivery_proofs')
    .select('id, photo_path')
    .eq('delivery_job_id', jobId)
    .eq('proof_type', proofType)
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return (data as { id: string; photo_path: string } | null) ?? null;
}

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
  const asset = result.assets?.[0];
  if (!asset?.uri) throw new AppError('No proof was submitted. Take a photo when you are ready.');

  let position: Location.LocationObject;
  try {
    position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  } catch {
    throw new AppError('Your location could not be captured. Enable location access and try again.');
  }
  // Verify auth before any storage upload to avoid orphan files when session expires
  const { data: authPre } = await supabase.auth.getUser();
  if (!authPre.user) throw new AppError('Please sign in again.');

  let assetUri = asset.uri;
  let mimeType = asset.mimeType ?? 'image/jpeg';
  let resized = false;

  // First-principles: resize to 1280w to avoid 4MB heap + OOM on low-end Android
  try {
    const { manipulateAsync, SaveFormat } = await import('expo-image-manipulator');
    const manipulated = await manipulateAsync(assetUri, [{ resize: { width: 1280 } }], {
      compress: 0.65,
      format: SaveFormat.JPEG,
    });
    assetUri = manipulated.uri;
    resized = true;
  } catch {
    // manipulator not available (web) — use original
  }
  if (resized) mimeType = 'image/jpeg';

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

  // Supabase storage expects Blob/Uint8Array on RN; ArrayBuffer fails on native
  const uploadBody = new Uint8Array(blob);

  const upload = await supabase.storage.from('delivery-proofs').upload(path, uploadBody, {
    contentType: mimeType,
    upsert: false,
    cacheControl: '3600',
  });
  if (upload.error) throw new AppError('Unable to upload proof. Check your connection and try again.', upload.error);

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    // Best-effort cleanup; RLS may block anon delete — orphan is private but log warning
    try {
      await supabase.storage.from('delivery-proofs').remove([path]);
    } catch {}
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
    // Best-effort orphan cleanup — never mask the original failure.
    try {
      await supabase.storage.from('delivery-proofs').remove([path]);
    } catch {}
    throw new AppError('The handoff could not be recorded. Please try again.', error);
  }

  return path;
}
