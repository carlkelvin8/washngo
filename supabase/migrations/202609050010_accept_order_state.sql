-- Harden accept_delivery_job: only accept when the order is actually looking
-- for a rider. Previously only the job's `available` status was validated, so
-- accepting a stale job for a cancelled/completed/delivered order flipped the
-- order back to *_rider_assigned. Preserves the zone check (0006) and the
-- per-rider advisory lock (0009).
create or replace function public.accept_delivery_job(p_job_id uuid) returns public.delivery_jobs language plpgsql security definer set search_path='' as $$
declare v_rider public.riders; v_job public.delivery_jobs; v_order public.orders;
begin
  perform pg_advisory_xact_lock(hashtext('accept_job:' || auth.uid()::text));
  select * into v_rider from public.riders where profile_id=auth.uid() and verification_status='approved' and is_online;
  if v_rider.id is null then raise exception 'Verified online rider required'; end if;
  if exists(select 1 from public.delivery_jobs where rider_id=v_rider.id and status in ('assigned','accepted','arriving','picked_up')) then raise exception 'Complete your current job first'; end if;
  select * into v_job from public.delivery_jobs where id=p_job_id and status='available' for update;
  if v_job.id is null then raise exception 'Job is no longer available'; end if;
  select * into v_order from public.orders where id=v_job.order_id for update;
  if v_order.id is null then raise exception 'Order not found'; end if;
  -- Leg check: pickup leg must be searching, return leg must be searching.
  if v_job.type='pickup_to_laundry' and v_order.status <> 'searching_pickup_rider' then raise exception 'This order is no longer looking for a pickup rider'; end if;
  if v_job.type='laundry_to_customer' and v_order.status <> 'searching_return_rider' then raise exception 'This order is no longer looking for a return rider'; end if;
  if v_rider.service_zone_id is not null and v_order.service_zone_id is not null and v_rider.service_zone_id <> v_order.service_zone_id then raise exception 'Job outside your service zone'; end if;
  update public.delivery_jobs set rider_id=v_rider.id,status='accepted',assigned_at=now(),accepted_at=now() where id=p_job_id returning * into v_job;
  update public.orders set status=case when v_job.type='pickup_to_laundry' then 'pickup_rider_assigned'::public.order_status else 'return_rider_assigned'::public.order_status end where id=v_job.order_id;
  return v_job;
end $$;
