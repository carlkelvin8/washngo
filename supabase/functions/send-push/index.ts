import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const secret = request.headers.get('x-webhook-secret');
  const expected = Deno.env.get('NOTIFICATION_WEBHOOK_SECRET');
  if (!secret || !expected || secret !== expected) return new Response('Unauthorized', { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const record = (body as { record?: { user_id?: string; title?: string; body?: string; data?: unknown } })?.record;
  if (!record?.user_id) return Response.json({ error: 'Missing record.user_id' }, { status: 400 });
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: tokens, error } = await supabase.from('push_tokens').select('token').eq('user_id', record.user_id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const allMessages = (tokens ?? []).map(({ token }) => ({ to: token, sound: 'default', title: record.title ?? 'WashNgo', body: record.body ?? '', data: record.data ?? {} }));
  // Expo limit 100 per request
  let sent = 0;
  for (let i = 0; i < allMessages.length; i += 100) {
    const chunk = allMessages.slice(i, i + 100);
    const res = await fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(chunk) });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error('Expo push failed', res.status, txt);
      continue;
    }
    const json = await res.json().catch(() => null) as { data?: { status?: string; details?: { error?: string } }[] } | null;
    // Prune invalid tokens
    const invalidTokens: string[] = [];
    json?.data?.forEach((ticket, idx) => {
      if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') invalidTokens.push(chunk[idx].to);
    });
    if (invalidTokens.length) await supabase.from('push_tokens').delete().in('token', invalidTokens);
    sent += chunk.length;
  }
  return Response.json({ sent });
});
