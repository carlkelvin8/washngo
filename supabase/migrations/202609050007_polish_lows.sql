-- Verification docs: owner can read own upload for preview
create policy verification_owner_read on storage.objects for select to authenticated using(
  bucket_id='verification-documents' and (storage.foldername(name))[1]=auth.uid()::text
);

-- Notification dedup: prevent spam for double log in one transaction
-- Add unique constraint on (user_id, data->>'order_id', title) with 5s window via function guard
create or replace function public.notify_order_status() returns trigger language plpgsql security definer set search_path='' as $$
declare v_user uuid; v_title text; v_body text;
begin
  select customer_id into v_user from public.orders where id=new.order_id;
  if v_user is null then return new; end if;
  -- dedup: skip if same title for same order within 5s
  if exists(select 1 from public.notifications where user_id=v_user and title= coalesce(new.note, new.to_status::text) and created_at > now() - interval '5 seconds' and data->>'order_id'=new.order_id::text) then return new; end if;
  v_title := case new.to_status::text when 'laundry_confirmation' then 'Booking received' when 'confirmed' then 'Booking confirmed' else 'Order update: '||replace(new.to_status::text,'_',' ') end;
  v_body := coalesce(new.note, 'Status: '||new.to_status::text);
  insert into public.notifications(user_id,title,body,data) values(v_user, v_title, v_body, jsonb_build_object('order_id', new.order_id, 'to_status', new.to_status));
  return new;
end $$;
drop trigger if exists notifications_on_status on public.order_status_logs;
create trigger notifications_on_status after insert on public.order_status_logs for each row execute function public.notify_order_status();
