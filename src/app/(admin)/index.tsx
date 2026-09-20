import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';

import { AccountCard } from '@/components/account-card';
import { Button, Card, EmptyState, ErrorState, LoadingState, Metric, Screen, Title, ui } from '@/components/ui';
import { getAdminMetrics, listVerificationRequests, setVerification } from '@/services/admin.service';
import { queryClient } from '@/lib/query-client';
import { friendlyError } from '@/lib/errors';

export default function AdminDashboard() {
  const metrics = useQuery({ queryKey: ['admin-metrics'], queryFn: getAdminMetrics });
  const requests = useQuery({ queryKey: ['verification-requests'], queryFn: listVerificationRequests });
  const [actingId, setActingId] = useState<string | null>(null);

  const verify = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' | 'suspended' }) => setVerification(id, status),
    onMutate: ({ id }) => setActingId(id),
    onSettled: () => setActingId(null),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['verification-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-metrics'] });
    },
  });

  if (metrics.isLoading || requests.isLoading) return <LoadingState label="Loading control center…" />;
  if (metrics.isError || requests.isError) {
    return (
      <ErrorState
        message="Admin data could not be loaded."
        retry={() => {
          void metrics.refetch();
          void requests.refetch();
        }}
      />
    );
  }

  const m = metrics.data ?? {};
  const isRefreshing = metrics.isFetching || requests.isFetching;

  return (
    <Screen refreshing={isRefreshing} onRefresh={() => { void metrics.refetch(); void requests.refetch(); }}>
      <Title eyebrow="Lipa City launch">WashNgo control center</Title>
      <View style={ui.grid}>
        <Metric label="Users" value={m.total_users ?? 0} />
        <Metric label="Active orders" value={m.active_orders ?? 0} />
        <Metric label="Orders today" value={m.orders_today ?? 0} />
        <Metric label="Platform revenue" value={`₱${Number(m.platform_revenue ?? 0).toFixed(0)}`} hint={`AOV ₱${Number(m.average_order_value ?? 0).toFixed(0)}`} />
      </View>
      <View style={ui.grid}>
        <Metric label="Partners" value={m.total_partner_laundries ?? 0} hint="Verified" />
        <Metric label="Online riders" value={m.online_riders ?? 0} hint="Live" />
        <Metric label="Completed" value={m.completed_orders ?? 0} />
      </View>

      <Text style={ui.h2}>Verification requests</Text>
      {verify.error ? <Text style={{ color: '#D64545', fontSize: 12 }}>{friendlyError(verify.error)}</Text> : null}
      {requests.data?.length ? (
        requests.data.map((profile) => (
          <Card key={profile.id}>
            <Text style={ui.h2}>{profile.full_name}</Text>
            <Text style={ui.body}>
              {profile.role.replace('_', ' ')} · joined {new Date(profile.created_at).toLocaleDateString()}
            </Text>
            <View style={ui.row}>
              <View style={ui.flex}>
                <Button loading={verify.isPending && actingId === profile.id} onPress={() => verify.mutate({ id: profile.id, status: 'approved' })}>
                  Approve
                </Button>
              </View>
              <View style={ui.flex}>
                <Button variant="danger" loading={verify.isPending && actingId === profile.id} onPress={() => verify.mutate({ id: profile.id, status: 'rejected' })}>
                  Reject
                </Button>
              </View>
            </View>
            <Button variant="secondary" loading={verify.isPending && actingId === profile.id} onPress={() => verify.mutate({ id: profile.id, status: 'suspended' })}>
              Suspend
            </Button>
          </Card>
        ))
      ) : (
        <EmptyState title="No pending requests" message="Verification requests will appear here when riders or partners register." />
      )}

      <AccountCard />
    </Screen>
  );
}
