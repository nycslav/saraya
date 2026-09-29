import type {
  AuthSession,
} from '@saraya/contracts';
import { createApiClient } from '@saraya/api-client';

import { getApiBaseUrl } from '@/core/config';

import { sessionStore } from './sessionStore';

export interface AuthGateway {
  restore(): Promise<AuthSession | null>;
  loginWithGoogle(idToken: string): Promise<AuthSession>;
  logout(): Promise<void>;
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
}

export const authGateway: AuthGateway = new ApiAuthGateway();
