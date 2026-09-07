import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import type { Profile } from '@/types/domain';
interface AuthState { session: Session | null; profile: Profile | null; restoring: boolean; setAuth: (session: Session | null, profile?: Profile | null) => void; setProfile: (profile: Profile | null) => void; setRestoring: (value: boolean) => void }
export const useAuthStore = create<AuthState>((set) => ({ session: null, profile: null, restoring: true, setAuth: (session, profile = null) => set({ session, profile }), setProfile: (profile) => set({ profile }), setRestoring: (restoring) => set({ restoring }) }));
