import { createApiClient } from '@saraya/api-client';

import { getApiBaseUrl } from '@/core/config';

import { sessionStore } from './sessionStore';

let refreshInFlight: Promise<string | null> | undefined;

export async function refreshAccessToken(rejectedAccessToken: string | null = null) {
  if (refreshInFlight) return refreshInFlight;
  const stored = await sessionStore.read();
  if (refreshInFlight) return refreshInFlight;
  if (!stored) return null;
  if (rejectedAccessToken && stored.accessToken !== rejectedAccessToken) {
    return stored.accessToken;
  }
  refreshInFlight = rotateSession(stored.refreshToken).finally(() => {
    refreshInFlight = undefined;
  });
  return refreshInFlight;
}

async function rotateSession(refreshToken: string) {
  try {
    const session = await createApiClient(getApiBaseUrl()).auth.refresh(refreshToken);
    await sessionStore.write(session.accessToken, session.refreshToken);
    return session.accessToken;
  } catch {
    await sessionStore.clear().catch(() => undefined);
    return null;
  }
}

export function createAuthenticatedApiClient() {
  return createApiClient(getApiBaseUrl(), {
    getAccessToken: async () => (await sessionStore.read())?.accessToken ?? null,
    refreshAccessToken,
  });
}

export async function runAuthenticatedRequest<T extends { status: number }>(
  operation: (accessToken: string | null) => Promise<T>,
) {
  const initialToken = (await sessionStore.read())?.accessToken ?? null;
  let response = await operation(initialToken);
  if (response.status === 401) {
    const refreshedToken = await refreshAccessToken(initialToken);
    if (refreshedToken) response = await operation(refreshedToken);
  }
  return response;
}
