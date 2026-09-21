import type { LoginRequest, RegisterRequest, UpdateProfileRequest, UserProfile } from '@saraya/contracts';
import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { authGateway } from './gateway';
import { getGoogleIdToken, signOutFromGoogle } from './googleSignIn';

type AuthContextValue = {
  user: UserProfile | null;
  restoring: boolean;
  login(input: LoginRequest): Promise<UserProfile>;
  register(input: RegisterRequest): Promise<UserProfile>;
  loginWithGoogle(): Promise<UserProfile | null>;
  updateProfile(input: UpdateProfileRequest): Promise<UserProfile>;
  logout(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    let active = true;
    void authGateway.restore()
      .then((session) => {
        if (active) setUser(session?.user ?? null);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setRestoring(false);
      });
    return () => { active = false; };
  }, []);

  const login = useCallback(async (input: LoginRequest) => {
    const session = await authGateway.login(input);
    setUser(session.user);
    return session.user;
  }, []);

  const register = useCallback(async (input: RegisterRequest) => {
    const session = await authGateway.register(input);
    setUser(session.user);
    return session.user;
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const idToken = await getGoogleIdToken();
    if (!idToken) return null;
    const session = await authGateway.loginWithGoogle(idToken);
    setUser(session.user);
    return session.user;
  }, []);

  const updateProfile = useCallback(async (input: UpdateProfileRequest) => {
    const updated = await authGateway.updateProfile(input);
    setUser(updated);
    return updated;
  }, []);

  const logout = useCallback(async () => {
    await Promise.allSettled([authGateway.logout(), signOutFromGoogle()]);
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user, restoring, login, register, loginWithGoogle, updateProfile, logout,
  }), [login, loginWithGoogle, logout, register, restoring, updateProfile, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
