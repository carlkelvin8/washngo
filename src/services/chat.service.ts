import { AppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

export interface ChatRoom {
  id: string;
  order_id: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export async function getRoomForOrder(orderId: string): Promise<ChatRoom | null> {
  const { data, error } = await supabase.from('chat_rooms').select('*').eq('order_id', orderId).maybeSingle();
  if (error) throw new AppError('Unable to load chat.', error);
  return (data as ChatRoom | null) ?? null;
}

export async function ensureRoomForOrder(orderId: string): Promise<ChatRoom> {
  const existing = await getRoomForOrder(orderId);
  if (existing) return existing;
  const { data, error } = await supabase.from('chat_rooms').insert({ order_id: orderId }).select().single();
  if (error) {
    // Race: two participants created at same time → unique on order_id
    if ((error as { code?: string }).code === '23505') {
      const retry = await getRoomForOrder(orderId);
      if (retry) return retry;
    }
    throw new AppError('Unable to start conversation. An admin may need to enable chat for this order.', error);
  }
  return data as ChatRoom;
}

export async function listMessages(roomId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase.from('messages').select('*').eq('room_id', roomId).order('created_at');
  if (error) throw new AppError('Unable to load messages.', error);
  return (data ?? []) as ChatMessage[];
}

export async function sendMessage(roomId: string, body: string): Promise<ChatMessage> {
  const trimmed = body.trim();
  if (!trimmed) throw new AppError('Enter a message.');
  if (trimmed.length > 2000) throw new AppError('Keep messages under 2000 characters.');
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new AppError('Please sign in again.');
  const { data, error } = await supabase.from('messages').insert({ room_id: roomId, sender_id: auth.user.id, body: trimmed }).select().single();
  if (error) throw new AppError('Message could not be sent.', error);
  return data as ChatMessage;
}
