-- Fix C4: transition_order atomic single-UPDATE, C9: handle_new_user rider pending, M8: consistent job flow

-- 1) Make transition_order atomic: single UPDATE to searching_* status, no double log/notify
create or replace function public.transition_order(p_order_id uuid,p_new_status public.order_status,p_note text default null) returns public.orders language plpgsql security definer set search_path='' as $$
declare v_order public.orders; v_shop public.laundry_shops; v_role public.app_role; v_allowed boolean:=false; v_address public.addresses; v_final_status public.order_status;
begin
  select * into v_order from public.orders where id=p_order_id for update; if v_order.id is null then raise exception 'Order not found'; end if; v_role:=public.current_role(); select * into v_shop from public.laundry_shops where id=v_order.laundry_shop_id;
  if v_role='admin' then v_allowed:=true;
  elsif v_role='laundry_partner' and v_shop.owner_id=auth.uid() then v_allowed := (v_order.status,p_new_status) in (('laundry_confirmation','confirmed'),('laundry_confirmation','rejected'),('received_by_laundry','processing'),('processing','ready_for_return'));
  elsif v_role='customer' and v_order.customer_id=auth.uid() then v_allowed := (v_order.status in ('pending','laundry_confirmation') and p_new_status='cancelled') or (v_order.status='delivered' and p_new_status='completed'); end if;
  if not v_allowed then raise exception 'Transition not permitted'; end if;

  -- Map terminal triggers to searching status atomically
  v_final_status := case when p_new_status='confirmed' then 'searching_pickup_rider'::public.order_status when p_new_status='ready_for_return' then 'searching_return_rider'::public.order_status else p_new_status end;

  update public.orders set status=v_final_status, completed_at=case when v_final_status='completed' then now() else completed_at end where id=p_order_id returning * into v_order;

  if p_new_status='confirmed' then select * into v_address from public.addresses where id=v_order.pickup_address_id; insert into public.delivery_jobs(order_id,type,pickup_latitude,pickup_longitude,destination_latitude,destination_longitude,rider_payout) values(v_order.id,'pickup_to_laundry',v_address.latitude,v_address.longitude,v_shop.latitude,v_shop.longitude,v_order.pickup_delivery_fee*0.75) on conflict do nothing;
  elsif p_new_status='ready_for_return' then select * into v_address from public.addresses where id=v_order.pickup_address_id; insert into public.delivery_jobs(order_id,type,pickup_latitude,pickup_longitude,destination_latitude,destination_longitude,rider_payout) values(v_order.id,'laundry_to_customer',v_shop.latitude,v_shop.longitude,v_address.latitude,v_address.longitude,v_order.return_delivery_fee*0.75) on conflict do nothing; end if;

  if p_note is not null then update public.order_status_logs set note=p_note where id=(select id from public.order_status_logs where order_id=p_order_id order by created_at desc limit 1); end if; return v_order;
end $$;

-- 2) Fix handle_new_user: riders/laundry_partners start pending, customers approved
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
declare v_role public.app_role;
begin
  v_role := coalesce((nullif(trim(new.raw_user_meta_data->>'role'),'')::public.app_role), 'customer'::public.app_role);
  -- fallback if cast fails: keep customer
  insert into public.profiles(id,role,full_name,phone,status) values(new.id, v_role, coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''),'WashNgo Customer'), new.raw_user_meta_data->>'phone', case when v_role in ('rider','laundry_partner') then 'pending'::public.account_status else 'approved'::public.account_status end);
  return new;
exception when others then
  insert into public.profiles(id,role,full_name,phone,status) values(new.id,'customer',coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''),'WashNgo Customer'),new.raw_user_meta_data->>'phone','approved');
  return new;
end $$;
