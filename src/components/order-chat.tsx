import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, ui } from '@/components/ui';
import { ensureRoomForOrder, getRoomForOrder, listMessages, sendMessage } from '@/services/chat.service';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/query-client';
import { friendlyError } from '@/lib/errors';
import { useAuthStore } from '@/store/auth.store';
import { colors, radius, space } from '@/constants/design';

export function OrderChat({ orderId }: { orderId: string }) {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [draft, setDraft] = useState('');

  const room = useQuery({ queryKey: ['chat-room', orderId], queryFn: () => getRoomForOrder(orderId) });
  const roomId = room.data?.id;

  const messages = useQuery({
    queryKey: ['chat-messages', roomId],
    queryFn: () => listMessages(roomId!),
    enabled: Boolean(roomId),
  });

  const ensure = useMutation({
    mutationFn: () => ensureRoomForOrder(orderId),
    onSuccess: (data) => queryClient.setQueryData(['chat-room', orderId], data),
  });

  const sender = useMutation({
    mutationFn: () => {
      if (!roomId) throw new Error('Chat room not ready');
      const body = draft.trim().slice(0, 2000);
      if (!body) throw new Error('Enter a message');
      return sendMessage(roomId, body);
    },
    onSuccess: async () => {
      setDraft('');
      await queryClient.invalidateQueries({ queryKey: ['chat-messages', roomId] });
    },
  });

  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`chat:${roomId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, () =>
        queryClient.invalidateQueries({ queryKey: ['chat-messages', roomId] }),
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' && __DEV__) console.warn('chat channel error', roomId);
      });
    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [roomId]);

  if (room.isLoading) return <Card><Text style={ui.body}>Loading chat…</Text></Card>;
  if (room.isError) return <Card><Text style={styles.error}>{friendlyError(room.error)}</Text></Card>;

  if (!roomId) {
    return (
      <Card>
        <Text style={ui.h2}>Support chat</Text>
        <Text style={ui.body}>Message the laundry partner or rider for this order. Participants only.</Text>
        {ensure.error ? <Text style={styles.error}>{friendlyError(ensure.error)}</Text> : null}
        <Button loading={ensure.isPending} onPress={() => ensure.mutate()}>
          Start conversation
        </Button>
        <Text style={ui.caption}>If this fails, the server chat policy needs an insert rule — orders stay fully functional without it.</Text>
      </Card>
    );
  }

  return (
    <Card>
      <Text style={ui.h2}>Order chat</Text>
      <Text style={ui.caption}>Room {roomId.slice(0, 8)}… · only participants can read or send.</Text>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={80}>
        {messages.isLoading ? (
          <Text style={ui.body}>Opening messages…</Text>
        ) : messages.data?.length ? (
          <ScrollView style={styles.listScroll} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
            {messages.data.map((item) => {
              const mine = item.sender_id === userId;
              return (
                <View key={item.id} style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                  <Text style={[styles.bubbleText, mine ? styles.mineText : styles.theirsText]}>{item.body}</Text>
                  <Text style={styles.time}>{new Date(item.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <Text style={ui.body}>No messages yet. Say hello!</Text>
        )}

        <View style={styles.row}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message…"
            maxLength={2000}
            style={styles.input}
            placeholderTextColor={colors.muted}
            returnKeyType="send"
            onSubmitEditing={() => draft.trim() && sender.mutate()}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !draft.trim() || sender.isPending }}
            onPress={() => draft.trim() && sender.mutate()}
            style={[styles.send, (!draft.trim() || sender.isPending) && styles.sendDisabled]}
            disabled={!draft.trim() || sender.isPending}
            hitSlop={8}
          >
            <Text style={styles.sendText}>{sender.isPending ? '…' : 'Send'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      {sender.error ? <Text style={styles.error}>{friendlyError(sender.error)}</Text> : null}
      {messages.error ? <Text style={styles.error}>{friendlyError(messages.error)}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  listScroll: { maxHeight: 320 },
  list: { gap: 8, paddingVertical: 4 },
  bubble: { maxWidth: '84%', padding: space.md, borderRadius: radius.md, gap: 4 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.blue },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.blueSoft, borderWidth: 1, borderColor: '#B8D7FF' },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  mineText: { color: colors.white },
  theirsText: { color: colors.ink },
  time: { fontSize: 10, color: colors.muted, alignSelf: 'flex-end' },
  row: { flexDirection: 'row', gap: space.sm, alignItems: 'center', marginTop: space.md },
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    backgroundColor: colors.white,
    color: colors.ink,
  },
  send: { backgroundColor: colors.blue, paddingHorizontal: 18, minHeight: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.45 },
  sendText: { color: colors.white, fontWeight: '800' },
  sep: { height: 8 },
  error: { color: colors.red, fontSize: 12, fontWeight: '600', marginTop: 6 },
});
