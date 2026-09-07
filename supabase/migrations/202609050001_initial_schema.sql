create extension if not exists pgcrypto;
create extension if not exists postgis;

create type public.app_role as enum ('customer','rider','laundry_partner','admin');
create type public.account_status as enum ('pending','approved','rejected','suspended');
create type public.order_status as enum ('pending','laundry_confirmation','confirmed','searching_pickup_rider','pickup_rider_assigned','rider_to_customer','picked_up','rider_to_laundry','received_by_laundry','processing','ready_for_return','searching_return_rider','return_rider_assigned','out_for_delivery','delivered','completed','cancelled','rejected');
create type public.job_type as enum ('pickup_to_laundry','laundry_to_customer');
create type public.job_status as enum ('available','assigned','accepted','arriving','picked_up','completed','cancelled');
create type public.pricing_type as enum ('per_kg','fixed');
create type public.payment_method as enum ('cod','pay_later');
create type public.payment_status as enum ('unpaid','partial','paid','refunded');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'customer', full_name text not null check (char_length(full_name) between 2 and 120),
  phone text, avatar_url text, status public.account_status not null default 'approved',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.service_zones (
  id uuid primary key default gen_random_uuid(), name text not null unique, city text not null, province text not null,
  boundary geography(polygon,4326), is_active boolean not null default true, created_at timestamptz not null default now()
);
create table public.addresses (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null, full_address text not null, barangay text not null, city text not null, province text not null,
  latitude double precision not null check(latitude between -90 and 90), longitude double precision not null check(longitude between -180 and 180),
  is_default boolean not null default false, created_at timestamptz not null default now()
);
create unique index addresses_one_default on public.addresses(user_id) where is_default;
create table public.laundry_shops (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null unique references public.profiles(id) on delete restrict,
  service_zone_id uuid references public.service_zones(id), name text not null, description text, logo_url text, phone text not null,
  address text not null, city text not null, province text not null, latitude double precision not null check(latitude between -90 and 90), longitude double precision not null check(longitude between -180 and 180),
  is_verified boolean not null default false, is_active boolean not null default true, average_rating numeric(3,2) not null default 0 check(average_rating between 0 and 5), operating_hours jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index laundry_shops_discovery on public.laundry_shops(city,is_verified,is_active);
create index laundry_shops_location on public.laundry_shops using gist ((st_setsrid(st_makepoint(longitude,latitude),4326)::geography));
create table public.laundry_services (
  id uuid primary key default gen_random_uuid(), shop_id uuid not null references public.laundry_shops(id) on delete cascade,
  name text not null, description text, price numeric(12,2) not null check(price >= 0), pricing_type public.pricing_type not null,
  minimum_charge numeric(12,2) not null default 0 check(minimum_charge >= 0), estimated_turnaround_hours integer not null check(estimated_turnaround_hours between 1 and 720),
  is_active boolean not null default true, created_at timestamptz not null default now(), unique(shop_id,name)
);
create table public.riders (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null unique references public.profiles(id) on delete cascade,
  service_zone_id uuid references public.service_zones(id), vehicle_type text not null, plate_number text,
  verification_status public.account_status not null default 'pending', is_online boolean not null default false,
  current_latitude double precision check(current_latitude between -90 and 90), current_longitude double precision check(current_longitude between -180 and 180),
  average_rating numeric(3,2) not null default 0 check(average_rating between 0 and 5), last_location_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index riders_dispatch on public.riders(service_zone_id,is_online,verification_status);
create sequence public.order_number_seq start 1001;
create table public.orders (
  id uuid primary key default gen_random_uuid(), order_number text not null unique default ('WNG-' || to_char(now(),'YYMMDD') || '-' || lpad(nextval('public.order_number_seq')::text,5,'0')),
  customer_id uuid not null references public.profiles(id), laundry_shop_id uuid not null references public.laundry_shops(id), pickup_address_id uuid not null references public.addresses(id), service_zone_id uuid references public.service_zones(id),
  pickup_date date not null, pickup_time time not null, status public.order_status not null default 'laundry_confirmation', estimated_weight numeric(8,2) not null check(estimated_weight > 0 and estimated_weight <= 50),
  laundry_subtotal numeric(12,2) not null check(laundry_subtotal >= 0), pickup_delivery_fee numeric(12,2) not null check(pickup_delivery_fee >= 0), return_delivery_fee numeric(12,2) not null check(return_delivery_fee >= 0), platform_fee numeric(12,2) not null check(platform_fee >= 0), total_amount numeric(12,2) not null check(total_amount >= 0),
  amount_due numeric(12,2) not null check(amount_due >= 0), amount_paid numeric(12,2) not null default 0 check(amount_paid >= 0), remaining_balance numeric(12,2) generated always as (greatest(amount_due - amount_paid,0)) stored,
  payment_method public.payment_method not null, payment_status public.payment_status not null default 'unpaid', special_instructions text check(char_length(special_instructions) <= 500),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), completed_at timestamptz
);
create index orders_customer_created on public.orders(customer_id,created_at desc); create index orders_shop_status on public.orders(laundry_shop_id,status); create index orders_status_created on public.orders(status,created_at);
create table public.order_items (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade, service_id uuid not null references public.laundry_services(id), quantity numeric(8,2) not null check(quantity > 0), unit_price numeric(12,2) not null check(unit_price >= 0), subtotal numeric(12,2) not null check(subtotal >= 0), unique(order_id,service_id)
);
create table public.order_status_logs (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  from_status public.order_status, to_status public.order_status not null, changed_by uuid references public.profiles(id), note text, created_at timestamptz not null default now()
);
create index status_logs_order_time on public.order_status_logs(order_id,created_at);
create table public.delivery_jobs (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade, type public.job_type not null, rider_id uuid references public.riders(id),
  pickup_latitude double precision not null, pickup_longitude double precision not null, destination_latitude double precision not null, destination_longitude double precision not null,
  status public.job_status not null default 'available', rider_payout numeric(12,2) not null check(rider_payout >= 0), assigned_at timestamptz, accepted_at timestamptz, picked_up_at timestamptz, completed_at timestamptz, created_at timestamptz not null default now(), unique(order_id,type)
);
create index jobs_available on public.delivery_jobs(status,created_at) where status='available'; create index jobs_rider_status on public.delivery_jobs(rider_id,status);
create table public.delivery_proofs (
  id uuid primary key default gen_random_uuid(), delivery_job_id uuid not null references public.delivery_jobs(id) on delete cascade, order_id uuid not null references public.orders(id) on delete cascade,
  proof_type text not null check(proof_type in ('pickup','delivery')), photo_path text not null, captured_at timestamptz not null default now(), latitude double precision not null, longitude double precision not null, captured_by uuid not null references public.profiles(id), otp_verified boolean not null default false, qr_token_hash text, created_at timestamptz not null default now()
);
create table public.payments (id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.orders(id) on delete cascade, method public.payment_method not null, status public.payment_status not null default 'unpaid', amount_due numeric(12,2) not null, amount_paid numeric(12,2) not null default 0, external_reference text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.ratings (id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade, customer_id uuid not null references public.profiles(id), target_type text not null check(target_type in ('laundry_shop','rider')), target_id uuid not null, stars integer not null check(stars between 1 and 5), review text check(char_length(review) <= 1000), created_at timestamptz not null default now(), unique(order_id,target_type,target_id));
create table public.notifications (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, title text not null, body text not null, data jsonb not null default '{}', read_at timestamptz, created_at timestamptz not null default now());
create index notifications_user_time on public.notifications(user_id,created_at desc);
create table public.push_tokens (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, token text not null unique, platform text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.chat_rooms (id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.orders(id) on delete cascade, created_at timestamptz not null default now());
create table public.messages (id uuid primary key default gen_random_uuid(), room_id uuid not null references public.chat_rooms(id) on delete cascade, sender_id uuid not null references public.profiles(id), body text not null check(char_length(body) between 1 and 2000), created_at timestamptz not null default now());

create or replace function public.current_role() returns public.app_role language sql stable security definer set search_path='' as $$ select role from public.profiles where id=auth.uid() $$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$ select coalesce(public.current_role()='admin',false) $$;
create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at(); create trigger shops_touch before update on public.laundry_shops for each row execute function public.touch_updated_at(); create trigger riders_touch before update on public.riders for each row execute function public.touch_updated_at(); create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at(); create trigger payments_touch before update on public.payments for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$ begin insert into public.profiles(id,role,full_name,phone,status) values(new.id,'customer',coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''),'WashNgo Customer'),new.raw_user_meta_data->>'phone','approved'); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.log_order_status() returns trigger language plpgsql security definer set search_path='' as $$ begin if old.status is distinct from new.status then insert into public.order_status_logs(order_id,from_status,to_status,changed_by) values(new.id,old.status,new.status,auth.uid()); end if; return new; end $$;
create trigger orders_log_status after update of status on public.orders for each row execute function public.log_order_status();

create or replace function public.create_booking(p_shop_id uuid,p_service_id uuid,p_address_id uuid,p_pickup_date date,p_pickup_time time,p_estimated_weight numeric,p_special_instructions text,p_payment_method public.payment_method) returns public.orders language plpgsql security definer set search_path='' as $$
declare v_service public.laundry_services; v_shop public.laundry_shops; v_address public.addresses; v_order public.orders; v_subtotal numeric(12,2); v_pickup numeric(12,2):=69; v_return numeric(12,2):=69; v_platform numeric(12,2);
begin
  if auth.uid() is null or public.current_role()<>'customer' then raise exception 'Customer account required'; end if;
  select * into v_service from public.laundry_services where id=p_service_id and shop_id=p_shop_id and is_active; select * into v_shop from public.laundry_shops where id=p_shop_id and is_verified and is_active; select * into v_address from public.addresses where id=p_address_id and user_id=auth.uid();
  if v_service.id is null or v_shop.id is null or v_address.id is null then raise exception 'Invalid shop, service, or address'; end if;
  if p_pickup_date<current_date or p_estimated_weight<=0 or p_estimated_weight>50 then raise exception 'Invalid pickup schedule or weight'; end if;
  v_subtotal:=greatest(v_service.minimum_charge,case when v_service.pricing_type='per_kg' then v_service.price*p_estimated_weight else v_service.price end); v_platform:=round(v_subtotal*0.05,2);
  insert into public.orders(customer_id,laundry_shop_id,pickup_address_id,service_zone_id,pickup_date,pickup_time,status,estimated_weight,laundry_subtotal,pickup_delivery_fee,return_delivery_fee,platform_fee,total_amount,amount_due,payment_method,special_instructions)
  values(auth.uid(),p_shop_id,p_address_id,v_shop.service_zone_id,p_pickup_date,p_pickup_time,'laundry_confirmation',p_estimated_weight,v_subtotal,v_pickup,v_return,v_platform,v_subtotal+v_pickup+v_return+v_platform,v_subtotal+v_pickup+v_return+v_platform,p_payment_method,p_special_instructions) returning * into v_order;
  insert into public.order_items(order_id,service_id,quantity,unit_price,subtotal) values(v_order.id,v_service.id,p_estimated_weight,v_service.price,v_subtotal); insert into public.payments(order_id,method,amount_due) values(v_order.id,p_payment_method,v_order.total_amount); insert into public.order_status_logs(order_id,to_status,changed_by,note) values(v_order.id,'laundry_confirmation',auth.uid(),'Booking created'); insert into public.notifications(user_id,title,body,data) values(auth.uid(),'Booking received','We sent your request to '||v_shop.name,jsonb_build_object('order_id',v_order.id));
  return v_order;
end $$;

create or replace function public.transition_order(p_order_id uuid,p_new_status public.order_status,p_note text default null) returns public.orders language plpgsql security definer set search_path='' as $$
declare v_order public.orders; v_shop public.laundry_shops; v_role public.app_role; v_allowed boolean:=false; v_address public.addresses;
begin
  select * into v_order from public.orders where id=p_order_id for update; if v_order.id is null then raise exception 'Order not found'; end if; v_role:=public.current_role(); select * into v_shop from public.laundry_shops where id=v_order.laundry_shop_id;
  if v_role='admin' then v_allowed:=true;
  elsif v_role='laundry_partner' and v_shop.owner_id=auth.uid() then v_allowed := (v_order.status,p_new_status) in (('laundry_confirmation','confirmed'),('laundry_confirmation','rejected'),('received_by_laundry','processing'),('processing','ready_for_return'));
  elsif v_role='customer' and v_order.customer_id=auth.uid() then v_allowed := (v_order.status in ('pending','laundry_confirmation') and p_new_status='cancelled') or (v_order.status='delivered' and p_new_status='completed'); end if;
  if not v_allowed then raise exception 'Transition not permitted'; end if;
  update public.orders set status=p_new_status, completed_at=case when p_new_status='completed' then now() else completed_at end where id=p_order_id returning * into v_order;
  if p_new_status='confirmed' then update public.orders set status='searching_pickup_rider' where id=p_order_id returning * into v_order; select * into v_address from public.addresses where id=v_order.pickup_address_id; insert into public.delivery_jobs(order_id,type,pickup_latitude,pickup_longitude,destination_latitude,destination_longitude,rider_payout) values(v_order.id,'pickup_to_laundry',v_address.latitude,v_address.longitude,v_shop.latitude,v_shop.longitude,v_order.pickup_delivery_fee*0.75) on conflict do nothing;
  elsif p_new_status='ready_for_return' then update public.orders set status='searching_return_rider' where id=p_order_id returning * into v_order; select * into v_address from public.addresses where id=v_order.pickup_address_id; insert into public.delivery_jobs(order_id,type,pickup_latitude,pickup_longitude,destination_latitude,destination_longitude,rider_payout) values(v_order.id,'laundry_to_customer',v_shop.latitude,v_shop.longitude,v_address.latitude,v_address.longitude,v_order.return_delivery_fee*0.75) on conflict do nothing; end if;
  if p_note is not null then update public.order_status_logs set note=p_note where id=(select id from public.order_status_logs where order_id=p_order_id order by created_at desc limit 1); end if; return v_order;
end $$;

create or replace function public.accept_delivery_job(p_job_id uuid) returns public.delivery_jobs language plpgsql security definer set search_path='' as $$ declare v_rider public.riders; v_job public.delivery_jobs; begin select * into v_rider from public.riders where profile_id=auth.uid() and verification_status='approved' and is_online; if v_rider.id is null then raise exception 'Verified online rider required'; end if; if exists(select 1 from public.delivery_jobs where rider_id=v_rider.id and status in ('assigned','accepted','arriving','picked_up')) then raise exception 'Complete your current job first'; end if; update public.delivery_jobs set rider_id=v_rider.id,status='accepted',assigned_at=now(),accepted_at=now() where id=p_job_id and status='available' returning * into v_job; if v_job.id is null then raise exception 'Job is no longer available'; end if; update public.orders set status=case when v_job.type='pickup_to_laundry' then 'pickup_rider_assigned'::public.order_status else 'return_rider_assigned'::public.order_status end where id=v_job.order_id; return v_job; end $$;
create or replace function public.transition_delivery_job(p_job_id uuid,p_new_status public.job_status) returns public.delivery_jobs language plpgsql security definer set search_path='' as $$ declare v_job public.delivery_jobs; v_rider public.riders; v_allowed boolean; begin select * into v_rider from public.riders where profile_id=auth.uid(); select * into v_job from public.delivery_jobs where id=p_job_id and rider_id=v_rider.id for update; if v_job.id is null then raise exception 'Assigned job not found'; end if; v_allowed := (v_job.status,p_new_status) in (('accepted','arriving'),('arriving','picked_up'),('picked_up','completed')); if not v_allowed then raise exception 'Invalid job transition'; end if; if p_new_status='picked_up' and not exists(select 1 from public.delivery_proofs where delivery_job_id=p_job_id and proof_type='pickup') then raise exception 'Pickup proof required'; end if; if p_new_status='completed' and not exists(select 1 from public.delivery_proofs where delivery_job_id=p_job_id and proof_type='delivery') then raise exception 'Delivery proof required'; end if; update public.delivery_jobs set status=p_new_status,picked_up_at=case when p_new_status='picked_up' then now() else picked_up_at end,completed_at=case when p_new_status='completed' then now() else completed_at end where id=p_job_id returning * into v_job; if p_new_status='arriving' then update public.orders set status=case when v_job.type='pickup_to_laundry' then 'rider_to_customer'::public.order_status else 'out_for_delivery'::public.order_status end where id=v_job.order_id; elsif p_new_status='picked_up' then update public.orders set status=case when v_job.type='pickup_to_laundry' then 'rider_to_laundry'::public.order_status else 'out_for_delivery'::public.order_status end where id=v_job.order_id; elsif p_new_status='completed' then update public.orders set status=case when v_job.type='pickup_to_laundry' then 'received_by_laundry'::public.order_status else 'delivered'::public.order_status end where id=v_job.order_id; end if; return v_job; end $$;
create or replace function public.set_rider_availability(p_is_online boolean) returns void language plpgsql security definer set search_path='' as $$ begin update public.riders set is_online=p_is_online where profile_id=auth.uid() and verification_status='approved'; if not found then raise exception 'Approved rider account required'; end if; end $$;
create or replace function public.update_rider_location(p_latitude double precision,p_longitude double precision) returns void language plpgsql security definer set search_path='' as $$ begin if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then raise exception 'Invalid coordinates'; end if; update public.riders set current_latitude=p_latitude,current_longitude=p_longitude,last_location_at=now() where profile_id=auth.uid() and is_online and verification_status='approved'; if not found then raise exception 'Rider must be online'; end if; end $$;
create or replace function public.register_push_token(p_token text,p_platform text) returns void language sql security definer set search_path='' as $$ insert into public.push_tokens(user_id,token,platform) values(auth.uid(),p_token,p_platform) on conflict(token) do update set user_id=excluded.user_id,platform=excluded.platform,updated_at=now() $$;
create or replace function public.set_account_status(p_profile_id uuid,p_status public.account_status) returns void language plpgsql security definer set search_path='' as $$ begin if not public.is_admin() then raise exception 'Admin required'; end if; update public.profiles set status=p_status where id=p_profile_id and role in ('rider','laundry_partner'); update public.riders set verification_status=p_status,is_online=case when p_status='approved' then is_online else false end where profile_id=p_profile_id; update public.laundry_shops set is_verified=(p_status='approved'),is_active=(p_status='approved') where owner_id=p_profile_id; end $$;
create or replace function public.admin_dashboard_metrics() returns jsonb language sql stable security definer set search_path='' as $$ select case when public.is_admin() then jsonb_build_object('total_users',(select count(*) from public.profiles),'total_partner_laundries',(select count(*) from public.laundry_shops where is_verified),'online_riders',(select count(*) from public.riders where is_online),'active_orders',(select count(*) from public.orders where status not in ('completed','cancelled','rejected')),'completed_orders',(select count(*) from public.orders where status='completed'),'orders_today',(select count(*) from public.orders where created_at::date=current_date),'platform_revenue',(select coalesce(sum(platform_fee),0) from public.orders where status='completed'),'average_order_value',(select coalesce(avg(total_amount),0) from public.orders where status='completed')) else null end $$;

grant execute on function public.create_booking to authenticated; grant execute on function public.transition_order to authenticated; grant execute on function public.accept_delivery_job to authenticated; grant execute on function public.transition_delivery_job to authenticated; grant execute on function public.set_rider_availability to authenticated; grant execute on function public.update_rider_location to authenticated; grant execute on function public.register_push_token to authenticated; grant execute on function public.set_account_status to authenticated; grant execute on function public.admin_dashboard_metrics to authenticated;
