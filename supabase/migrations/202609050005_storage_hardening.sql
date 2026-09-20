-- Hardening: tighten delivery-proofs write and add delete for cleanup
-- Proof write: only rider assigned to that order's job may upload
drop policy if exists proof_rider_write on storage.objects;
create policy proof_rider_write on storage.objects for insert to authenticated with check(
  bucket_id='delivery-proofs'
  and exists(
    select 1 from public.delivery_jobs j
    join public.riders r on r.id=j.rider_id
    where r.profile_id=auth.uid()
      and r.verification_status='approved'
      and j.order_id::text=(storage.foldername(name))[1]
      and j.id::text=(storage.foldername(name))[2]
  )
);

-- Allow rider/admin to delete own proof during failure cleanup (insert-then-rollback)
create policy proof_rider_delete on storage.objects for delete to authenticated using(
  bucket_id='delivery-proofs'
  and (
    public.is_admin()
    or exists(
      select 1 from public.delivery_jobs j
      join public.riders r on r.id=j.rider_id
      where r.profile_id=auth.uid()
        and j.order_id::text=(storage.foldername(name))[1]
    )
  )
);

-- Also allow proof owner (captured_by) via delivery_proofs table — handled via participant read, but ensure storage delete for orphan cleanup
