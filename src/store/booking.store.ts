import { create } from 'zustand';
export interface BookingDraft { shopId?: string; serviceId?: string; addressId?: string; pickupDate?: string; pickupTime?: string; estimatedWeight: number; specialInstructions: string; paymentMethod: 'cod' | 'pay_later' }
const initial: BookingDraft = { estimatedWeight: 3, specialInstructions: '', paymentMethod: 'cod' };
export const useBookingStore = create<BookingDraft & { patch: (value: Partial<BookingDraft>) => void; reset: () => void }>((set) => ({ ...initial, patch: (value) => set(value), reset: () => set(initial) }));
