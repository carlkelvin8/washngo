-- Fix 1: create_booking past time check (today + past time)
create or replace function public.create_booking(p_shop_id uuid,p_service_id uuid,p_address_id uuid,p_pickup_date date,p_pickup_time time,p_estimated_weight numeric,p_special_instructions text,p_payment_method public.payment_method) returns public.orders language plpgsql security definer set search_path='' as $$
declare v_service public.laundry_services; v_shop public.laundry_shops; v_address public.addresses; v_order public.orders; v_subtotal numeric(12,2); v_pickup numeric(12,2):=69; v_return numeric(12,2):=69; v_platform numeric(12,2); v_pickup_ts timestamptz;
begin
  if auth.uid() is null or public.current_role()<>'customer' then raise exception 'Customer account required'; end if;
  select * into v_service from public.laundry_services where id=p_service_id and shop_id=p_shop_id and is_active; select * into v_shop from public.laundry_shops where id=p_shop_id and is_verified and is_active; select * into v_address from public.addresses where id=p_address_id and user_id=auth.uid();
  if v_service.id is null or v_shop.id is null or v_address.id is null then raise exception 'Invalid shop, service, or address'; end if;
  if p_pickup_date<current_date or p_estimated_weight<=0 or p_estimated_weight>50 then raise exception 'Invalid pickup schedule or weight'; end if;
  v_pickup_ts := (p_pickup_date + p_pickup_time) at time zone 'Asia/Manila';
  if v_pickup_ts < now() + interval '2 hours' then raise exception 'Schedule pickup at least 2 hours from now'; end if;
  v_subtotal:=greatest(v_service.minimum_charge,case when v_service.pricing_type='per_kg' then v_service.price*p_estimated_weight else v_service.price end); v_platform:=round(v_subtotal*0.05,2);
  insert into public.orders(customer_id,laundry_shop_id,pickup_address_id,service_zone_id,pickup_date,pickup_time,status,estimated_weight,laundry_subtotal,pickup_delivery_fee,return_delivery_fee,platform_fee,total_amount,amount_due,payment_method,special_instructions)
  values(auth.uid(),p_shop_id,p_address_id,v_shop.service_zone_id,p_pickup_date,p_pickup_time,'laundry_confirmation',p_estimated_weight,v_subtotal,v_pickup,v_return,v_platform,v_subtotal+v_pickup+v_return+v_platform,v_subtotal+v_pickup+v_return+v_platform,p_payment_method,p_special_instructions) returning * into v_order;
  insert into public.order_items(order_id,service_id,quantity,unit_price,subtotal) values(v_order.id,v_service.id,p_estimated_weight,v_service.price,v_subtotal); insert into public.payments(order_id,method,amount_due) values(v_order.id,p_payment_method,v_order.total_amount); insert into public.order_status_logs(order_id,to_status,changed_by,note) values(v_order.id,'laundry_confirmation',auth.uid(),'Booking created'); insert into public.notifications(user_id,title,body,data) values(auth.uid(),'Booking received','We sent your request to '||v_shop.name,jsonb_build_object('order_id',v_order.id));
  return v_order;
end $$;

-- Fix 2: accept_delivery_job zone check
create or replace function public.accept_delivery_job(p_job_id uuid) returns public.delivery_jobs language plpgsql security definer set search_path='' as $$ declare v_rider public.riders; v_job public.delivery_jobs; v_order public.orders; begin select * into v_rider from public.riders where profile_id=auth.uid() and verification_status='approved' and is_online; if v_rider.id is null then raise exception 'Verified online rider required'; end if; if exists(select 1 from public.delivery_jobs where rider_id=v_rider.id and status in ('assigned','accepted','arriving','picked_up')) then raise exception 'Complete your current job first'; end if; select * into v_job from public.delivery_jobs where id=p_job_id and status='available' for update; if v_job.id is null then raise exception 'Job is no longer available'; end if; select * into v_order from public.orders where id=v_job.order_id; if v_rider.service_zone_id is not null and v_order.service_zone_id is not null and v_rider.service_zone_id <> v_order.service_zone_id then raise exception 'Job outside your service zone'; end if; update public.delivery_jobs set rider_id=v_rider.id,status='accepted',assigned_at=now(),accepted_at=now() where id=p_job_id returning * into v_job; update public.orders set status=case when v_job.type='pickup_to_laundry' then 'pickup_rider_assigned'::public.order_status else 'return_rider_assigned'::public.order_status end where id=v_job.order_id; return v_job; end $$;

-- Fix 3: rating fraud — target must match order's shop or rider leg
create or replace function public.submit_rating(p_order_id uuid, p_target_type text, p_target_id uuid, p_stars int, p_review text) returns public.ratings language plpgsql security definer set search_path='' as $$
declare v_order public.orders; v_rating public.ratings;
begin
  select * into v_order from public.orders where id=p_order_id and customer_id=auth.uid() and status='completed' for update;
  if v_order.id is null then raise exception 'Completed order required'; end if;
  if p_target_type='laundry_shop' and p_target_id <> v_order.laundry_shop_id then raise exception 'Invalid laundry target for this order'; end if;
  if p_target_type='rider' and not exists(select 1 from public.delivery_jobs j join public.riders r on r.id=j.rider_id where j.order_id=p_order_id and r.profile_id=p_target_id) then raise exception 'Invalid rider target for this order'; end if;
  insert into public.ratings(order_id,customer_id,target_type,target_id,stars,review) values(p_order_id,auth.uid(),p_target_type,p_target_id,p_stars,p_review) returning * into v_rating;
  -- recalc average
  if p_target_type='laundry_shop' then update public.laundry_shops set average_rating=(select coalesce(avg(stars),0) from public.ratings where target_type='laundry_shop' and target_id=p_target_id) where id=p_target_id;
  else update public.riders set average_rating=(select coalesce(avg(stars),0) from public.ratings where target_type='rider' and target_id=p_target_id) where profile_id=p_target_id;
  end if;
  return v_rating;
end $$;

-- Fix 4: RLS null zone riders can see available jobs (MVP)
drop policy if exists jobs_eligible_select on public.delivery_jobs;
create policy jobs_eligible_select on public.delivery_jobs for select to authenticated using(public.is_admin() or exists(select 1 from public.riders r where r.profile_id=auth.uid() and r.verification_status='approved' and (r.id=rider_id or (r.is_online and status='available' and (r.service_zone_id is null or r.service_zone_id = (select o.service_zone_id from public.orders o where o.id=order_id))))) or exists(select 1 from public.orders o where o.id=order_id and (o.customer_id=auth.uid() or exists(select 1 from public.laundry_shops s where s.id=o.laundry_shop_id and s.owner_id=auth.uid()))));

-- Rating insert policy tighten: use new function instead of direct check
drop policy if exists ratings_customer_insert on public.ratings;
create policy ratings_customer_insert on public.ratings for insert to authenticated with check(customer_id=auth.uid() and exists(select 1 from public.orders o where o.id=order_id and o.customer_id=auth.uid() and o.status='completed'));
