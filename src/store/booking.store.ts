import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface BookingDraft {
  shopId?: string;
  serviceId?: string;
  addressId?: string;
  pickupDate?: string;
  pickupTime?: string;
  estimatedWeight: number;
  specialInstructions: string;
  paymentMethod: 'cod' | 'pay_later';
}

const initial: BookingDraft = { estimatedWeight: 3, specialInstructions: '', paymentMethod: 'cod' };

// Fallback for SSR / server builds where localStorage is unavailable.
const memoryStorage = {
  getItem: (_key: string): string | null => null,
  setItem: (_key: string, _value: string): void => undefined,
  removeItem: (_key: string): void => undefined,
};

function getBookingStorage(): Storage {
  try {
    if (typeof localStorage !== 'undefined' && localStorage !== null) return localStorage as Storage;
  } catch {
    // private browsing
  }
  return memoryStorage as unknown as Storage;
}

export const useBookingStore = create<BookingDraft & { patch: (value: Partial<BookingDraft>) => void; reset: () => void }>()(
  persist(
    (set) => ({
      ...initial,
      patch: (value) => set((state) => ({ ...state, ...value })),
      reset: () => set(initial),
    }),
    {
      name: 'washngo-booking',
      storage: createJSONStorage(() => getBookingStorage()),
      partialize: (state) => ({
        shopId: state.shopId,
        serviceId: state.serviceId,
        addressId: state.addressId,
        // pickupDate/time intentionally re-validated via initialPickup expiry — keep but version bump handles old drafts
        pickupDate: state.pickupDate,
        pickupTime: state.pickupTime,
        estimatedWeight: state.estimatedWeight,
        specialInstructions: state.specialInstructions,
        paymentMethod: state.paymentMethod,
      }),
      version: 2,
      migrate: (persisted: unknown, version: number) => {
        const s = persisted as Partial<BookingDraft>;
        if (version < 2) {
          // Drop potentially stale pickup times from old drafts
          delete s.pickupDate;
          delete s.pickupTime;
        }
        return s as BookingDraft;
      },
    },
  ),
);
