import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (request) => {
  const secret = request.headers.get('x-webhook-secret');
  if (!secret || secret !== Deno.env.get('NOTIFICATION_WEBHOOK_SECRET')) return new Response('Unauthorized', { status: 401 });
  const { record } = await request.json();
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: tokens, error } = await supabase.from('push_tokens').select('token').eq('user_id', record.user_id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const messages = (tokens ?? []).map(({ token }) => ({ to: token, sound: 'default', title: record.title, body: record.body, data: record.data }));
  if (messages.length) await fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(messages) });
  return Response.json({ sent: messages.length });
});
