-- Max-level hardening: proof idempotency + accept race
--
-- 1) One proof per (job, type): a retry after "upload OK / transition failed"
--    must not create duplicate storage objects + proof rows. The client now
--    reuses the existing proof (getProofForJob); this constraint makes it
--    airtight at the DB level.
-- 2) accept_delivery_job TOCTOU: the exists-check for an active job and the
--    update were not atomic — two concurrent accepts for different jobs could
--    both pass the check. Serialize per-rider with a transaction-scoped
--    advisory lock (released automatically at commit/rollback).

-- 1) Dedupe any pre-existing duplicates, then enforce uniqueness.
delete from public.delivery_proofs a using public.delivery_proofs b
where a.ctid < b.ctid
  and a.delivery_job_id = b.delivery_job_id
  and a.proof_type = b.proof_type;

create unique index if not exists delivery_proofs_job_type_unique
  on public.delivery_proofs (delivery_job_id, proof_type);

-- 2) Rewrite accept with per-rider serialization. Body preserves the zone
-- check added in 202609050006 — only the advisory lock line is new.
create or replace function public.accept_delivery_job(p_job_id uuid) returns public.delivery_jobs language plpgsql security definer set search_path='' as $$
declare v_rider public.riders; v_job public.delivery_jobs; v_order public.orders;
begin
  -- Serialize concurrent accepts from the same rider (Supavisor runs each RPC
  -- in its own transaction, so the xact lock is held across check + update).
  perform pg_advisory_xact_lock(hashtext('accept_job:' || auth.uid()::text));
  select * into v_rider from public.riders where profile_id=auth.uid() and verification_status='approved' and is_online;
  if v_rider.id is null then raise exception 'Verified online rider required'; end if;
  if exists(select 1 from public.delivery_jobs where rider_id=v_rider.id and status in ('assigned','accepted','arriving','picked_up')) then raise exception 'Complete your current job first'; end if;
  select * into v_job from public.delivery_jobs where id=p_job_id and status='available' for update;
  if v_job.id is null then raise exception 'Job is no longer available'; end if;
  select * into v_order from public.orders where id=v_job.order_id;
  if v_rider.service_zone_id is not null and v_order.service_zone_id is not null and v_rider.service_zone_id <> v_order.service_zone_id then raise exception 'Job outside your service zone'; end if;
  update public.delivery_jobs set rider_id=v_rider.id,status='accepted',assigned_at=now(),accepted_at=now() where id=p_job_id returning * into v_job;
  update public.orders set status=case when v_job.type='pickup_to_laundry' then 'pickup_rider_assigned'::public.order_status else 'return_rider_assigned'::public.order_status end where id=v_job.order_id;
  return v_job;
end $$;
