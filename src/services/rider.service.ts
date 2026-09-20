import * as Location from 'expo-location';

import { AppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { DeliveryJob, JobStatus } from '@/types/domain';

export async function getRiderStatus() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new AppError('Please sign in again.');
  const { data, error } = await supabase
    .from('riders')
    .select('is_online,verification_status,current_latitude,current_longitude')
    .eq('profile_id', user.id)
    .single();
  if (error) throw new AppError('Unable to load rider status.', error);
  return data as { is_online: boolean; verification_status: string; current_latitude: number | null; current_longitude: number | null };
}

export async function listAvailableJobs(): Promise<DeliveryJob[]> {
  const { data, error } = await supabase.from('delivery_jobs').select('*, order:orders(*)').eq('status', 'available').order('created_at');
  if (error) throw new AppError('Unable to load delivery jobs.', error);
  return (data ?? []) as DeliveryJob[];
}

export async function listMyJobs(): Promise<DeliveryJob[]> {
  const { data, error } = await supabase.from('delivery_jobs').select('*, order:orders(*)').neq('status', 'available').order('created_at', { ascending: false }).limit(50);
  if (error) throw new AppError('Unable to load your jobs.', error);
  return (data ?? []) as DeliveryJob[];
}

export const JOBS_PAGE_SIZE = 10;

export async function listMyJobsPage(page: number, pageSize = JOBS_PAGE_SIZE): Promise<{ data: DeliveryJob[]; hasMore: boolean }> {
  const from = page * pageSize;
  const to = from + pageSize;
  const { data, error } = await supabase
    .from('delivery_jobs')
    .select('*, order:orders(*)')
    .neq('status', 'available')
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw new AppError('Unable to load your jobs.', error);
  const rows = (data ?? []) as DeliveryJob[];
  const hasMore = rows.length > pageSize;
  return { data: hasMore ? rows.slice(0, pageSize) : rows, hasMore };
}

export async function acceptJob(jobId: string) {
  const { data, error } = await supabase.rpc('accept_delivery_job', { p_job_id: jobId });
  if (error) throw new AppError(error.message, error);
  return data as DeliveryJob;
}

export async function updateJob(jobId: string, status: JobStatus) {
  const { data, error } = await supabase.rpc('transition_delivery_job', { p_job_id: jobId, p_new_status: status });
  if (error) throw new AppError(error.message, error);
  return data as DeliveryJob;
}

export async function setAvailability(isOnline: boolean) {
  const { error } = await supabase.rpc('set_rider_availability', { p_is_online: isOnline });
  if (error) throw new AppError('Unable to update availability.', error);
}

async function ensureForegroundPermission(message: string) {
  const existing = await Location.getForegroundPermissionsAsync();
  if (existing.granted) return;
  if (!existing.canAskAgain) throw new AppError(message);
  const requested = await Location.requestForegroundPermissionsAsync();
  if (!requested.granted) throw new AppError(message);
}

export async function updateCurrentLocation() {
  await ensureForegroundPermission('Location permission is required while you are online.');
  const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const { error } = await supabase.rpc('update_rider_location', {
    p_latitude: location.coords.latitude,
    p_longitude: location.coords.longitude,
  });
  if (error) throw new AppError('Unable to update your location.', error);
}

export async function setRiderOnline(isOnline: boolean) {
  if (!isOnline) return setAvailability(false);

  await ensureForegroundPermission('Enable location access in Settings before going online.');

  const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  await setAvailability(true);

  const { error } = await supabase.rpc('update_rider_location', {
    p_latitude: location.coords.latitude,
    p_longitude: location.coords.longitude,
  });

  if (error) {
    await setAvailability(false);
    throw new AppError('Your location could not be verified, so you remain offline.', error);
  }
}
