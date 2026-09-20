import { useEffect } from 'react';

import { restoreAuth } from '@/services/auth.service';
import { getProfile } from '@/services/profile.service';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';

export function useAuthBootstrap() {
  const { setAuth, setRestoring } = useAuthStore();

  useEffect(() => {
    let active = true;

    restoreAuth()
      .then(({ session, profile }) => {
        if (active) setAuth(session, profile);
      })
      .catch((error) => console.error('Auth restore failed', error))
      .finally(() => {
        if (active) setRestoring(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (!session) {
        setAuth(null, null);
        return;
      }
      const capturedSession = session;
      // Defer profile fetch to avoid deadlock inside auth callback.
      setTimeout(() => {
        if (!active) return;
        getProfile(capturedSession.user.id)
          .then((profile) => {
            if (active) setAuth(capturedSession, profile);
          })
          .catch((error) => {
            if (__DEV__) console.error('Profile refresh failed', error);
            // Keep session but clear profile so RouterGuard shows loading and can retry
            if (active) setAuth(capturedSession, null);
          });
      }, 0);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [setAuth, setRestoring]);
}
