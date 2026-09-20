import { AppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { Order, OrderStatus } from '@/types/domain';

export interface CreateBookingInput {
  shopId: string;
  serviceId: string;
  addressId: string;
  pickupDate: string;
  pickupTime: string;
  estimatedWeight: number;
  specialInstructions?: string;
  paymentMethod: 'cod' | 'pay_later';
}

export async function createBooking(input: CreateBookingInput): Promise<Order> {
  const { data, error } = await supabase.rpc('create_booking', {
    p_shop_id: input.shopId,
    p_service_id: input.serviceId,
    p_address_id: input.addressId,
    p_pickup_date: input.pickupDate,
    p_pickup_time: input.pickupTime,
    p_estimated_weight: input.estimatedWeight,
    p_special_instructions: input.specialInstructions || null,
    p_payment_method: input.paymentMethod,
  });
  if (error) throw new AppError(error.message, error);
  return data as Order;
}

export async function listMyOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, laundry_shop:laundry_shops(*), pickup_address:addresses(*), order_items(*, service:laundry_services(*))')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new AppError('Unable to load orders.', error);
  return (data ?? []) as Order[];
}

export const ORDERS_PAGE_SIZE = 10;

export async function listMyOrdersPage(page: number, pageSize = ORDERS_PAGE_SIZE): Promise<{ data: Order[]; hasMore: boolean }> {
  const from = page * pageSize;
  const to = from + pageSize; // fetch one extra to detect hasMore
  const { data, error } = await supabase
    .from('orders')
    .select('*, laundry_shop:laundry_shops(*), pickup_address:addresses(*), order_items(*, service:laundry_services(*))')
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw new AppError('Unable to load orders.', error);
  const rows = (data ?? []) as Order[];
  const hasMore = rows.length > pageSize;
  return { data: hasMore ? rows.slice(0, pageSize) : rows, hasMore };
}

export async function getOrder(id: string): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, laundry_shop:laundry_shops(*), pickup_address:addresses(*), order_items(*, service:laundry_services(*))')
    .eq('id', id)
    .single();
  if (error || !data) throw new AppError('Unable to load order.', error);
  return data as Order;
}

export async function transitionOrder(orderId: string, status: OrderStatus, note?: string): Promise<Order> {
  const { data, error } = await supabase.rpc('transition_order', { p_order_id: orderId, p_new_status: status, p_note: note ?? null });
  if (error) throw new AppError(error.message, error);
  return data as Order;
}
