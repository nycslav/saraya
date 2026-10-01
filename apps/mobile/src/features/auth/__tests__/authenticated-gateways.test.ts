import * as FileSystem from 'expo-file-system/legacy';

import { ApiBucketListGateway } from '@/features/bucket-list/gateways';
import { ApiJourneyGateway } from '@/features/journey/gateways';
import { refreshAccessToken } from '../authenticated-api';
import { ApiAuthGateway } from '../gateway';
import { sessionStore } from '../sessionStore';

jest.mock('../sessionStore', () => ({
  sessionStore: {
    read: jest.fn(),
    write: jest.fn(),
    clear: jest.fn(),
    onCleared: jest.fn(() => jest.fn()),
  },
}));

jest.mock('expo-file-system/legacy', () => ({
  uploadAsync: jest.fn(),
  FileSystemUploadType: { MULTIPART: 1 },
}));

const readSession = sessionStore.read as jest.MockedFunction<typeof sessionStore.read>;
const writeSession = sessionStore.write as jest.MockedFunction<typeof sessionStore.write>;
const clearSession = sessionStore.clear as jest.MockedFunction<typeof sessionStore.clear>;
const upload = FileSystem.uploadAsync as jest.MockedFunction<typeof FileSystem.uploadAsync>;

describe('authenticated personal-data gateways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.saraya.test';
    readSession.mockResolvedValue({ accessToken: 'saraya-access-token', refreshToken: 'refresh' });
    clearSession.mockResolvedValue(undefined);
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    });
  });

  it('adds the Saraya access token to Bucket List and Journey requests', async () => {
    await new ApiBucketListGateway().list();
    await new ApiJourneyGateway().timeline();

    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      'https://api.saraya.test/bucket-list',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer saraya-access-token' }),
      }),
    );
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      'https://api.saraya.test/check-ins/timeline',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer saraya-access-token' }),
      }),
    );
  });

  it('adds the Saraya access token to native Journey photo uploads', async () => {
    upload.mockResolvedValue({
      body: JSON.stringify({ photoUrl: '/uploads/check-ins/photo.jpg' }),
      headers: {},
      mimeType: 'application/json',
      status: 201,
    });

    await new ApiJourneyGateway().uploadPhoto('file:///photo.jpg', 'image/jpeg', 'photo.jpg');

    expect(upload).toHaveBeenCalledWith(
      'https://api.saraya.test/check-ins/photos',
      'file:///photo.jpg',
      expect.objectContaining({
        headers: { Authorization: 'Bearer saraya-access-token' },
      }),
    );
  });

  it('shares one rotating refresh across simultaneous expired-token requests', async () => {
    globalThis.fetch = jest.fn(async (input, init) => {
      const url = String(input);
      const authorization = (init?.headers as Record<string, string> | undefined)?.Authorization;
      if (url.endsWith('/auth/refresh')) {
        await Promise.resolve();
        return {
          ok: true,
          status: 200,
          json: async () => ({
            accessToken: 'fresh-access-token',
            refreshToken: 'rotated-refresh-token',
            user: {
              id: 'user-1', email: 'traveler@example.com', displayName: 'Traveler',
              avatarUrl: null, homeRegion: null, travelStyle: null, budget: null,
              interests: [], preferredRegions: [], onboardingComplete: true,
            },
          }),
        } as Response;
      }
      if (authorization === 'Bearer fresh-access-token') {
        return { ok: true, status: 200, json: async () => [] } as Response;
      }
      return { ok: false, status: 401, json: async () => ({ message: 'Expired' }) } as Response;
    }) as jest.Mock;

    await Promise.all([
      new ApiBucketListGateway().list(),
      new ApiJourneyGateway().timeline(),
    ]);

    const refreshCalls = (globalThis.fetch as jest.Mock).mock.calls.filter(
      ([url]) => String(url).endsWith('/auth/refresh'),
    );
    expect(refreshCalls).toHaveLength(1);
    expect(writeSession).toHaveBeenCalledWith('fresh-access-token', 'rotated-refresh-token');
  });

  it('clears the session when token rotation fails', async () => {
    globalThis.fetch = jest.fn(async (input) => {
      const url = String(input);
      return {
        ok: false,
        status: 401,
        json: async () => ({ message: url.endsWith('/auth/refresh') ? 'Invalid refresh' : 'Expired' }),
      } as Response;
    }) as jest.Mock;

    await expect(new ApiBucketListGateway().list()).rejects.toMatchObject({ status: 401 });
    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('reuses an already-rotated access token for a late stale 401', async () => {
    readSession.mockResolvedValue({
      accessToken: 'already-rotated-access-token',
      refreshToken: 'already-rotated-refresh-token',
    });
    globalThis.fetch = jest.fn();

    await expect(refreshAccessToken('expired-access-token'))
      .resolves.toBe('already-rotated-access-token');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('adds the Saraya access token to profile photo uploads', async () => {
    upload.mockResolvedValue({
      body: JSON.stringify({ photoUrl: '/uploads/check-ins/profile-photo.jpg' }),
      headers: {},
      mimeType: 'application/json',
      status: 201,
    });

    await new ApiAuthGateway().uploadProfilePhoto('file:///profile.jpg', 'image/jpeg', 'profile.jpg');

    expect(upload).toHaveBeenCalledWith(
      'https://api.saraya.test/auth/profile/photo',
      'file:///profile.jpg',
      expect.objectContaining({
        headers: { Authorization: 'Bearer saraya-access-token' },
      }),
    );
  });

  it('refreshes a stored session when the app restores', async () => {
    const restored = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      user: {
        id: 'user-1',
        email: 'traveler@example.com',
        displayName: 'Traveler',
        avatarUrl: null,
        homeRegion: null,
        travelStyle: null,
        budget: null,
        interests: [],
        preferredRegions: [],
        onboardingComplete: true,
      },
    };
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => restored,
    });

    await expect(new ApiAuthGateway().restore()).resolves.toEqual(restored);
    expect(writeSession).toHaveBeenCalledWith('new-access-token', 'new-refresh-token');
  });

  it('revokes the refresh token and clears local credentials on logout', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, status: 204 });

    await new ApiAuthGateway().logout();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.saraya.test/auth/logout',
      expect.objectContaining({
        body: JSON.stringify({ refreshToken: 'refresh' }),
        headers: expect.objectContaining({ Authorization: 'Bearer saraya-access-token' }),
        method: 'POST',
      }),
    );
    expect(clearSession).toHaveBeenCalledTimes(1);
  });
});
