-- Fix: allow order participants to create chat rooms and realtime for chat
create policy chat_rooms_participant_insert on public.chat_rooms for insert to authenticated
  with check (exists (
    select 1 from public.orders o
    where o.id = order_id and (
      o.customer_id = auth.uid()
      or exists (select 1 from public.laundry_shops s where s.id = o.laundry_shop_id and s.owner_id = auth.uid())
      or exists (select 1 from public.delivery_jobs j join public.riders r on r.id = j.rider_id where j.order_id = o.id and r.profile_id = auth.uid())
      or public.is_admin()
    )
  ));

-- Enable realtime for chat (messages + rooms) so postgres_changes works for OrderChat
alter publication supabase_realtime add table public.chat_rooms;
alter publication supabase_realtime add table public.messages;
