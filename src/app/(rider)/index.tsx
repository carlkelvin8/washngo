import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';

import { AccountCard } from '@/components/account-card';
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, Metric, Screen, Title, ui } from '@/components/ui';
import { acceptJob, getRiderStatus, listAvailableJobs, listMyJobsPage, setRiderOnline, updateJob } from '@/services/rider.service';
import { captureAndUploadProof } from '@/services/storage.service';
import { queryClient } from '@/lib/query-client';
import { friendlyError } from '@/lib/errors';
import { useAuthStore } from '@/store/auth.store';
import type { DeliveryJob, JobStatus } from '@/types/domain';
import { colors } from '@/constants/design';

const nextJob: Partial<Record<JobStatus, { label: string; status: JobStatus }>> = {
  assigned: { label: 'Accept job', status: 'accepted' },
  accepted: { label: 'Confirm arrival', status: 'arriving' },
  arriving: { label: 'Confirm pickup', status: 'picked_up' },
  picked_up: { label: 'Complete delivery', status: 'completed' },
};

function ActiveJob({ job }: { job: DeliveryJob }) {
  const action = nextJob[job.status];
  const mutation = useMutation({
    mutationFn: async () => {
      if (action?.status === 'picked_up') await captureAndUploadProof(job.id, job.order_id, 'pickup');
      if (action?.status === 'completed') await captureAndUploadProof(job.id, job.order_id, 'delivery');
      return updateJob(job.id, action!.status);
    },
    onSuccess: async () => {
      try {
        const Haptics = await import('expo-haptics');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      void queryClient.invalidateQueries({ queryKey: ['rider-jobs', 'paged'] });
    },
    onError: async () => {
      try {
        const Haptics = await import('expo-haptics');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
    },
  });

  const run = () => {
    if (!action) return;
    const needsProof = ['picked_up', 'completed'].includes(action.status);
    Alert.alert(
      action.label,
      needsProof ? 'The camera will open and WashNgo will attach your current location as proof.' : 'This status is visible to the customer and laundry partner.',
      [
        { text: 'Not yet', style: 'cancel' },
        { text: needsProof ? 'Open camera' : 'Confirm', onPress: () => mutation.mutate() },
      ],
    );
  };

  return (
    <Card>
      <View style={ui.between}>
        <Text style={ui.h2}>{job.type === 'pickup_to_laundry' ? 'Customer → Laundry' : 'Laundry → Customer'}</Text>
        <Badge>{job.status}</Badge>
      </View>
      <Text style={ui.body}>Payout ₱{job.rider_payout.toFixed(2)}</Text>
      <Text style={ui.caption}>
        Pickup pin {job.pickup_latitude.toFixed(5)}, {job.pickup_longitude.toFixed(5)}
      </Text>
      <Text style={ui.caption}>
        Drop-off pin {job.destination_latitude.toFixed(5)}, {job.destination_longitude.toFixed(5)}
      </Text>
      {mutation.error ? (
        <>
          <Text style={styles.error}>{friendlyError(mutation.error)}</Text>
          <Button variant="secondary" onPress={() => void Linking.openSettings()}>
            Open permission settings
          </Button>
        </>
      ) : null}
      {action ? (
        <Button loading={mutation.isPending} onPress={run}>
          {action.label}
        </Button>
      ) : null}
    </Card>
  );
}

export default function RiderDashboard() {
  const profile = useAuthStore((state) => state.profile);
  const status = useQuery({ queryKey: ['rider-status'], queryFn: getRiderStatus, enabled: profile?.status === 'approved' });
  const online = status.data?.is_online ?? false;

  const available = useQuery({ queryKey: ['available-jobs'], queryFn: listAvailableJobs, enabled: online && profile?.status === 'approved' });
  const mine = useInfiniteQuery({
    queryKey: ['rider-jobs', 'paged'],
    queryFn: ({ pageParam }) => listMyJobsPage(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length : undefined),
  });

  const availability = useMutation({
    mutationFn: setRiderOnline,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['rider-status'] });
      await queryClient.invalidateQueries({ queryKey: ['available-jobs'] });
    },
  });

  const accept = useMutation({
    mutationFn: acceptJob,
    onSuccess: async () => {
      try {
        const Haptics = await import('expo-haptics');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      await queryClient.invalidateQueries({ queryKey: ['available-jobs'] });
      await queryClient.invalidateQueries({ queryKey: ['rider-jobs', 'paged'] });
    },
  });

  if (mine.isLoading || status.isLoading) return <LoadingState label="Loading delivery board…" />;
  if (mine.isError || status.isError) {
    return <ErrorState message="Your delivery board is unavailable." retry={() => { void mine.refetch(); void status.refetch(); }} />;
  }

  if (profile?.status !== 'approved') {
    return (
      <Screen>
        <Title>Verification {profile?.status ?? 'pending'}</Title>
        <Text style={ui.body}>You can go online and accept jobs after an admin approves your rider documents.</Text>
        <AccountCard />
      </Screen>
    );
  }

  const flatJobs = mine.data?.pages.flatMap((p) => p.data) ?? [];
  const active = flatJobs.find((job) => !['completed', 'cancelled'].includes(job.status));
  const completed = flatJobs.filter((job) => job.status === 'completed');
  const earnings = completed.reduce((sum, job) => sum + job.rider_payout, 0);
  const isRefreshing = (mine.isFetching && !mine.isFetchingNextPage) || available.isFetching;

  return (
    <Screen refreshing={isRefreshing} onRefresh={() => { void mine.refetch(); void available.refetch(); }}>
      <Title eyebrow={online ? 'Online · Lipa City' : 'Offline'}>Rider dashboard</Title>

      <Button variant={online ? 'danger' : 'primary'} loading={availability.isPending} onPress={() => availability.mutate(!online)}>
        {online ? 'Go offline' : 'Go online'}
      </Button>

      {availability.error ? (
        <>
          <Text style={styles.error}>{friendlyError(availability.error)}</Text>
          <Button variant="secondary" onPress={() => void Linking.openSettings()}>
            Open location settings
          </Button>
        </>
      ) : null}

      <View style={ui.grid}>
        <Metric label="Completed" value={completed.length} />
        <Metric label="Earnings" value={`₱${earnings.toFixed(0)}`} hint="Completed deliveries" />
      </View>

      {active ? (
        <>
          <Text style={ui.h2}>Current job</Text>
          <ActiveJob job={active} />
        </>
      ) : null}

      <Text style={ui.h2}>Available nearby</Text>
      {available.isLoading ? (
        <LoadingState label="Searching for jobs…" />
      ) : available.data?.length ? (
        available.data.map((job) => (
          <Card key={job.id}>
            <Text style={ui.h2}>{job.type === 'pickup_to_laundry' ? 'Pickup to laundry' : 'Return to customer'}</Text>
            <Text style={ui.price}>₱{job.rider_payout.toFixed(2)} payout</Text>
            <Button
              loading={accept.isPending}
              disabled={Boolean(active)}
              onPress={() =>
                Alert.alert('Accept this job?', active ? 'Finish your current job first.' : 'You must complete it before accepting another delivery.', [
                  { text: 'Not now', style: 'cancel' },
                  { text: 'Accept job', onPress: () => accept.mutate(job.id) },
                ])
              }
            >
              {active ? 'Finish current job first' : 'Accept job'}
            </Button>
          </Card>
        ))
      ) : (
        <EmptyState
          title={online ? 'No jobs nearby' : 'You are offline'}
          message={online ? 'Eligible Lipa City jobs will appear here. Pull to refresh.' : 'Go online to receive delivery jobs.'}
        />
      )}

      {accept.error ? <Text style={styles.error}>{friendlyError(accept.error)}</Text> : null}

      <Text style={ui.h2}>Job history</Text>
      {flatJobs.filter((j) => ['completed', 'cancelled'].includes(j.status)).length ? (
        <>
          {flatJobs
            .filter((j) => ['completed', 'cancelled'].includes(j.status))
            .slice(0, 5)
            .map((job) => (
              <Card key={`hist-${job.id}`}>
                <View style={ui.between}>
                  <Text style={ui.body}>{job.type === 'pickup_to_laundry' ? 'Pickup → Laundry' : 'Laundry → Customer'}</Text>
                  <Badge tone={job.status === 'completed' ? 'success' : 'danger'}>{job.status}</Badge>
                </View>
                <Text style={ui.caption}>Payout ₱{job.rider_payout.toFixed(2)} · {new Date(job.created_at).toLocaleDateString()}</Text>
              </Card>
            ))}
          {mine.hasNextPage ? (
            <Button variant="secondary" loading={mine.isFetchingNextPage} onPress={() => void mine.fetchNextPage()}>
              Load more history
            </Button>
          ) : (
            <Text style={ui.caption}>End of history.</Text>
          )}
        </>
      ) : (
        <Text style={ui.body}>No completed deliveries yet.</Text>
      )}

      <AccountCard />
    </Screen>
  );
}

const styles = StyleSheet.create({ error: { color: colors.red, fontSize: 13, fontWeight: '600' } });
