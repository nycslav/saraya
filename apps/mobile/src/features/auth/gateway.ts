import type {
  AccountReauthenticationResponse,
  AuthSession,
  UpdateProfileInput,
  UserProfile,
} from '@saraya/contracts';
import { photoUploadResultSchema } from '@saraya/contracts';
import { ApiClientError, createApiClient } from '@saraya/api-client';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { getApiBaseUrl } from '@/core/config';

import { sessionStore } from './sessionStore';

export interface AuthGateway {
  restore(): Promise<AuthSession | null>;
  loginWithGoogle(idToken: string): Promise<AuthSession>;
  logout(): Promise<void>;
  updateProfile(input: UpdateProfileInput): Promise<UserProfile>;
  uploadProfilePhoto(uri: string, mimeType?: string | null, fileName?: string | null): Promise<string>;
  reauthenticateAccount(idToken: string): Promise<AccountReauthenticationResponse>;
  exportAccountData(accountActionToken: string): Promise<Blob>;
  downloadAccountData(accountActionToken: string, fileUri: string): Promise<void>;
  deleteAccount(accountActionToken: string): Promise<void>;
}

function client() {
  return createApiClient(getApiBaseUrl(), async () => (await sessionStore.read())?.accessToken ?? null);
}

async function persist(session: AuthSession) {
  await sessionStore.write(session.accessToken, session.refreshToken);
  return session;
}

export class ApiAuthGateway implements AuthGateway {
  async restore() {
    const stored = await sessionStore.read();
    if (!stored) return null;

    try {
      return await persist(await client().auth.refresh(stored.refreshToken));
    } catch {
      await sessionStore.clear();
      return null;
    }
  }

  async loginWithGoogle(idToken: string) {
    return persist(await client().auth.google({ idToken }));
  }

  async logout() {
    const stored = await sessionStore.read();
    try {
      if (stored) await client().auth.logout(stored.refreshToken);
    } finally {
      await sessionStore.clear();
    }
  }

  updateProfile(input: UpdateProfileInput) {
    return client().auth.updateProfile(input);
  }

  async uploadProfilePhoto(uri: string, mimeType?: string | null, fileName?: string | null) {
    const baseUrl = getApiBaseUrl().replace(/\/$/, '');
    const normalizedMimeType = mimeType === 'image/jpg' ? 'image/jpeg' : (mimeType ?? 'image/jpeg');
    if (Platform.OS !== 'web') {
      const accessToken = (await sessionStore.read())?.accessToken;
      const response = await FileSystem.uploadAsync(`${baseUrl}/auth/profile/photo`, uri, {
        fieldName: 'photo',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        httpMethod: 'POST',
        mimeType: normalizedMimeType,
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      });
      const payload = parseUploadResponse(response.body);
      if (response.status < 200 || response.status >= 300) {
        throw new ApiClientError(readUploadError(payload, response.status), response.status);
      }
      return photoUploadResultSchema.parse(payload).photoUrl;
    }

    const blob = await fetch(uri).then((response) => response.blob());
    const form = new FormData();
    form.append('photo', blob, fileName ?? `profile-${Date.now()}.jpg`);
    return (await client().auth.uploadProfilePhoto(form)).photoUrl;
  }

  reauthenticateAccount(idToken: string) {
    return client().auth.reauthenticateAccount({ idToken });
  }

  exportAccountData(accountActionToken: string) {
    return client().auth.exportAccountData(accountActionToken);
  }

  async downloadAccountData(accountActionToken: string, fileUri: string) {
    const accessToken = (await sessionStore.read())?.accessToken;
    const response = await FileSystem.downloadAsync(
      `${getApiBaseUrl().replace(/\/$/, '')}/account/export`,
      fileUri,
      { headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        'x-account-action-token': accountActionToken,
      } },
    );
    if (response.status < 200 || response.status >= 300) {
      throw new ApiClientError('Your data export could not be downloaded.', response.status);
    }
  }

  deleteAccount(accountActionToken: string) {
    return client().auth.deleteAccount({ accountActionToken, confirmation: 'DELETE' });
  }
}

function parseUploadResponse(body: string): unknown {
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

function readUploadError(payload: unknown, status: number) {
  if (
    typeof payload === 'object' && payload !== null && 'error' in payload &&
    typeof payload.error === 'object' && payload.error !== null && 'message' in payload.error &&
    typeof payload.error.message === 'string'
  ) return payload.error.message;
  return `Profile photo upload failed with status ${status}.`;
}

export const authGateway: AuthGateway = new ApiAuthGateway();

export function resolveAvatarUrl(avatarUrl: string | null) {
  if (!avatarUrl || !avatarUrl.startsWith('/')) return avatarUrl;
  return `${getApiBaseUrl().replace(/\/$/, '')}${avatarUrl}`;
}
