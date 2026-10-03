import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

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

// Cross-platform async storage: SecureStore on native, localStorage on web
const secureBookingStorage: StateStorage = {
  getItem: async (key) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {}
  },
  removeItem: async (key) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {}
  },
};

const webBookingStorage: StateStorage = {
  getItem: (key) => {
    try {
      if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
    } catch {}
    return null;
  },
  setItem: (key, value) => {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    } catch {}
  },
  removeItem: (key) => {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    } catch {}
  },
};

function getBookingStorage(): StateStorage {
  return Platform.OS === 'web' ? webBookingStorage : secureBookingStorage;
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
      storage: createJSONStorage(() => getBookingStorage() as StateStorage),
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
