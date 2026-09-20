import type { OrderStatus } from '@/types/domain';

const labels: Record<OrderStatus, string> = {
  pending: 'Booking started',
  laundry_confirmation: 'Waiting for laundry confirmation',
  confirmed: 'Booking confirmed',
  searching_pickup_rider: 'Finding a pickup rider',
  pickup_rider_assigned: 'Pickup rider assigned',
  rider_to_customer: 'Rider heading to you',
  picked_up: 'Laundry picked up',
  rider_to_laundry: 'On the way to the laundry',
  received_by_laundry: 'Received by the laundry',
  processing: 'Laundry in progress',
  ready_for_return: 'Ready for return',
  searching_return_rider: 'Finding a return rider',
  return_rider_assigned: 'Return rider assigned',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Declined by laundry',
};

export function orderStatusLabel(status: OrderStatus) {
  return labels[status] ?? status.replaceAll('_', ' ');
}

export function orderStatusTone(status: OrderStatus): 'info' | 'success' | 'warning' | 'danger' {
  if (status === 'completed') return 'success';
  if (status === 'cancelled' || status === 'rejected') return 'danger';
  if (status === 'laundry_confirmation' || status.startsWith('searching')) return 'warning';
  return 'info';
}
