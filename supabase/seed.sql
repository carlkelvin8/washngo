-- Seed application data after creating demo auth users in Dashboard/Auth.
insert into public.service_zones(id,name,city,province,is_active) values('10000000-0000-0000-0000-000000000001','Lipa City Core','Lipa City','Batangas',true) on conflict do nothing;

-- Link partner profiles by replacing the owner UUIDs below with IDs from auth.users.
-- Recommended local credentials (create with the Supabase dashboard or admin API):
-- customer@washngo.demo / WashNgo!2026
-- rider@washngo.demo / WashNgo!2026
-- laundry@washngo.demo / WashNgo!2026
-- admin@washngo.demo / WashNgo!2026
-- Then set roles/status server-side; never expose the service role key to Expo.

do $$
declare owner_one uuid; owner_two uuid; shop_one uuid; shop_two uuid;
begin
  select id into owner_one from public.profiles where role='laundry_partner' order by created_at limit 1;
  select id into owner_two from public.profiles where role='laundry_partner' order by created_at offset 1 limit 1;
  if owner_one is not null then
    insert into public.laundry_shops(owner_id,service_zone_id,name,description,phone,address,city,province,latitude,longitude,is_verified,is_active,average_rating,operating_hours)
    values(owner_one,'10000000-0000-0000-0000-000000000001','Lipa Fresh Laundry Hub','Careful wash-and-fold with same-day options.','09171234567','Ayala Highway, Brgy. Balintawak','Lipa City','Batangas',13.9563,121.1627,true,true,4.82,'{"mon-fri":"08:00-19:00","sat-sun":"08:00-18:00"}') on conflict(owner_id) do update set name=excluded.name returning id into shop_one;
    insert into public.laundry_services(shop_id,name,description,price,pricing_type,minimum_charge,estimated_turnaround_hours) values
      (shop_one,'Wash & Fold','Everyday clothes, washed and neatly folded.',65,'per_kg',195,24),(shop_one,'Wash, Dry & Fold','Full-care wash with machine drying.',78,'per_kg',234,20),(shop_one,'Premium / Delicate','Gentle care for sensitive fabrics.',145,'per_kg',290,48) on conflict(shop_id,name) do nothing;
  end if;
  if owner_two is not null then
    insert into public.laundry_shops(owner_id,service_zone_id,name,description,phone,address,city,province,latitude,longitude,is_verified,is_active,average_rating,operating_hours)
    values(owner_two,'10000000-0000-0000-0000-000000000001','Labada Lane Lipa','Neighborhood laundry care with careful sorting.','09181234567','P. Torres Street, Brgy. 7','Lipa City','Batangas',13.9416,121.1649,true,true,4.67,'{"daily":"07:30-18:30"}') on conflict(owner_id) do update set name=excluded.name returning id into shop_two;
    insert into public.laundry_services(shop_id,name,description,price,pricing_type,minimum_charge,estimated_turnaround_hours) values(shop_two,'Wash & Fold','Fresh, clean, and folded.',60,'per_kg',180,30),(shop_two,'Premium / Delicate','Low-agitation premium care.',135,'per_kg',270,48) on conflict(shop_id,name) do nothing;
  end if;
end $$;
