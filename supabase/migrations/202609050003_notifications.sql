create or replace function public.notify_order_status() returns trigger language plpgsql security definer set search_path='' as $$
declare v_title text; v_body text;
begin
  if old.status is not distinct from new.status then return new; end if;
  v_title := case new.status when 'confirmed' then 'Booking accepted' when 'pickup_rider_assigned' then 'Pickup rider assigned' when 'rider_to_customer' then 'Rider is on the way' when 'rider_to_laundry' then 'Laundry picked up' when 'received_by_laundry' then 'Received by laundry' when 'processing' then 'Laundry in progress' when 'ready_for_return' then 'Laundry is ready' when 'return_rider_assigned' then 'Return rider assigned' when 'out_for_delivery' then 'Out for delivery' when 'delivered' then 'Laundry delivered' when 'completed' then 'Order completed' when 'rejected' then 'Booking declined' else 'Order updated' end;
  v_body := 'Order '||new.order_number||' is now '||replace(new.status::text,'_',' ')||'.';
  insert into public.notifications(user_id,title,body,data) values(new.customer_id,v_title,v_body,jsonb_build_object('order_id',new.id,'status',new.status));
  return new;
end $$;
create trigger orders_notify_status after update of status on public.orders for each row execute function public.notify_order_status();
