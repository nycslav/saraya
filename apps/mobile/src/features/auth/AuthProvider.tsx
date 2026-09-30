import type { UserProfile } from '@saraya/contracts';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import {
  identifyRevenueCatUser,
  resetRevenueCatUser,
} from '@/features/subscriptions/services/revenuecat';

import { authGateway } from './gateway';
import { getGoogleIdToken, signOutFromGoogle } from './googleSignIn';
import { sessionStore } from './sessionStore';

type AuthContextValue = {
  user: UserProfile | null;
  restoring: boolean;
  isDevelopmentPreview: boolean;
  loginWithGoogle(): Promise<UserProfile | null>;
  logout(): Promise<void>;
  saveProfile(input: SaveProfileInput): Promise<UserProfile>;
  exportAccount(): Promise<void>;
  deleteAccount(): Promise<void>;
};

export type SaveProfileInput = {
  displayName: string;
  photo?: { uri: string; mimeType?: string | null; fileName?: string | null };
};

const AuthContext = createContext<AuthContextValue | null>(null);

const developmentPreviewUser: UserProfile = {
  id: 'development-profile-preview',
  email: 'preview@saraya.local',
  displayName: 'Saraya Traveler',
  avatarUrl: null,
  homeRegion: 'Bicol Region',
  travelStyle: 'Culture and nature',
  budget: 'Mid-range',
  interests: ['Local culture', 'Nature', 'Food'],
  preferredRegions: ['Bicol Region', 'Central Visayas'],
  onboardingComplete: true,
};

export function isDevelopmentAuthBypassEnabled(
  isDevelopment = __DEV__,
  configuredValue = process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS,
) {
  return isDevelopment && configuredValue === 'true';
}

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
  const [isDevelopmentPreview, setIsDevelopmentPreview] = useState(false);

  useEffect(() => {
    let active = true;
    const previewEnabled = isDevelopmentAuthBypassEnabled();
    void authGateway.restore()
      .then(async (session) => {
        if (session) {
          await synchronizeRevenueCatUser(session.user.id);
        } else {
          await resetRevenueCatUser().catch(() => undefined);
        }
        if (active) {
          setUser(session?.user ?? (previewEnabled ? developmentPreviewUser : null));
          setIsDevelopmentPreview(!session && previewEnabled);
        }
      })
      .catch(async () => {
        await resetRevenueCatUser().catch(() => undefined);
        if (active) {
          setUser(previewEnabled ? developmentPreviewUser : null);
          setIsDevelopmentPreview(previewEnabled);
        }
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
    setIsDevelopmentPreview(false);
    return session.user;
  }, []);

  const logout = useCallback(async () => {
    if (isDevelopmentPreview) {
      await resetRevenueCatUser().catch(() => undefined);
    } else {
      await Promise.allSettled([
        authGateway.logout(),
        signOutFromGoogle(),
        resetRevenueCatUser(),
      ]);
    }
    setUser(null);
    setIsDevelopmentPreview(false);
  }, [isDevelopmentPreview]);

  const saveProfile = useCallback(async ({ displayName, photo }: SaveProfileInput) => {
    if (!user) throw new Error('Sign in to edit your profile.');

    if (isDevelopmentPreview) {
      const updated = { ...user, displayName: displayName.trim(), avatarUrl: photo?.uri ?? user.avatarUrl };
      setUser(updated);
      return updated;
    }

    const avatarUrl = photo
      ? await authGateway.uploadProfilePhoto(photo.uri, photo.mimeType, photo.fileName)
      : undefined;
    const updated = await authGateway.updateProfile({ displayName, ...(avatarUrl ? { avatarUrl } : {}) });
    setUser(updated);
    return updated;
  }, [isDevelopmentPreview, user]);

  const reauthenticate = useCallback(async () => {
    if (!user || isDevelopmentPreview) throw new Error('Sign in with Google to manage account data.');
    const idToken = await getGoogleIdToken();
    if (!idToken) throw new Error('Google confirmation was cancelled.');
    return authGateway.reauthenticateAccount(idToken);
  }, [isDevelopmentPreview, user]);

  const exportAccount = useCallback(async () => {
    const { accountActionToken } = await reauthenticate();
    if (Platform.OS === 'web') {
      const blob = await authGateway.exportAccountData(accountActionToken);
      const url = URL.createObjectURL(blob);
      const documentValue = globalThis.document;
      const anchor = documentValue.createElement('a');
      anchor.href = url;
      anchor.download = 'saraya-account-data.zip';
      anchor.click();
      URL.revokeObjectURL(url);
      return;
    }
    const file = new File(Paths.cache, 'saraya-account-data.zip');
    if (file.exists) file.delete();
    await authGateway.downloadAccountData(accountActionToken, file.uri);
    if (!await Sharing.isAvailableAsync()) throw new Error('Sharing is not available on this device.');
    await Sharing.shareAsync(file.uri, { mimeType: 'application/zip', dialogTitle: 'Save your Saraya data' });
  }, [reauthenticate]);

  const deleteAccount = useCallback(async () => {
    const { accountActionToken } = await reauthenticate();
    await authGateway.deleteAccount(accountActionToken);
    await Promise.allSettled([sessionStore.clear(), signOutFromGoogle(), resetRevenueCatUser()]);
    setUser(null);
    setIsDevelopmentPreview(false);
  }, [reauthenticate]);

  const value = useMemo(() => ({
    user, restoring, isDevelopmentPreview, loginWithGoogle, logout, saveProfile,
    exportAccount, deleteAccount,
  }), [deleteAccount, exportAccount, isDevelopmentPreview, loginWithGoogle, logout, restoring, saveProfile, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
