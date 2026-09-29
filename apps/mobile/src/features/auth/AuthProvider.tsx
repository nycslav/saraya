import type { UserProfile } from '@saraya/contracts';
import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  identifyRevenueCatUser,
  resetRevenueCatUser,
} from '@/features/subscriptions/services/revenuecat';

import { authGateway } from './gateway';
import { getGoogleIdToken, signOutFromGoogle } from './googleSignIn';

type AuthContextValue = {
  user: UserProfile | null;
  restoring: boolean;
  loginWithGoogle(): Promise<UserProfile | null>;
  logout(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function synchronizeRevenueCatUser(userId: string) {
  try {
    await identifyRevenueCatUser(userId);
  } catch {
    // Authentication must remain available when purchases are not configured, but stale
    // customer state must not be allowed to cross an account boundary.
    await resetRevenueCatUser().catch(() => undefined);
    console.warn('RevenueCat identity could not be synchronized for the authenticated user.');
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    let active = true;
    void authGateway.restore()
      .then(async (session) => {
        if (session) {
          await synchronizeRevenueCatUser(session.user.id);
        } else {
          await resetRevenueCatUser().catch(() => undefined);
        }
        if (active) setUser(session?.user ?? null);
      })
      .catch(async () => {
        await resetRevenueCatUser().catch(() => undefined);
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setRestoring(false);
      });
    return () => { active = false; };
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const idToken = await getGoogleIdToken();
    if (!idToken) return null;
    const session = await authGateway.loginWithGoogle(idToken);
    await synchronizeRevenueCatUser(session.user.id);
    setUser(session.user);
    return session.user;
  }, []);

  const logout = useCallback(async () => {
    await Promise.allSettled([
      authGateway.logout(),
      signOutFromGoogle(),
      resetRevenueCatUser(),
    ]);
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user, restoring, loginWithGoogle, logout,
  }), [loginWithGoogle, logout, restoring, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
