import { useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Text, View } from 'react-native';

import { Button, Card, EmptyState, ErrorState, LoadingState, Screen, Title, ui } from '@/components/ui';
import { listNotifications, markNotificationRead } from '@/services/notification.service';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/store/auth.store';

export default function NotificationsScreen() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const query = useQuery({ queryKey: ['notifications'], queryFn: () => listNotifications(30) });
  const read = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () =>
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      )
      .subscribe((s) => {
        if (s === 'CHANNEL_ERROR' && __DEV__) console.warn('notifications channel error');
      });
    return () => { supabase.removeChannel(channel).catch(() => {}); };
  }, [userId]);

  if (query.isLoading) return <LoadingState label="Loading notifications…" />;
  if (query.isError) return <ErrorState message="Notifications are unavailable." retry={() => void query.refetch()} />;

  return (
    <Screen refreshing={query.isFetching} onRefresh={() => void query.refetch()}>
      <Title eyebrow={`${query.data?.length ?? 0} updates`}>Notifications</Title>
      {query.data?.length ? (
        query.data.map((n) => (
          <Card key={n.id}>
            <View style={ui.between}>
              <Text style={ui.h2}>{n.title}</Text>
              <Text style={ui.caption}>{new Date(n.created_at).toLocaleString()}</Text>
            </View>
            <Text style={ui.body}>{n.body}</Text>
            {!n.read_at ? (
              <Button variant="secondary" loading={read.isPending} onPress={() => read.mutate(n.id)}>
                Mark as read
              </Button>
            ) : (
              <Text style={ui.caption}>Read</Text>
            )}
          </Card>
        ))
      ) : (
        <EmptyState title="All caught up" message="Order updates and rider messages will appear here." />
      )}
    </Screen>
  );
}
