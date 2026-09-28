import { ApiGenerationQuotaGateway } from '../gateways/api-generation-quota.gateway';

const state = {
  access: 'premium',
  quota: {
    access: 'premium',
    includedLimit: 10,
    includedRemaining: 8,
    topUpRemaining: 10,
    canGenerate: true,
    canRegenerate: true,
    periodStart: '2026-09-01T00:00:00.000Z',
    periodEnd: '2026-10-01T00:00:00.000Z',
  },
};

jest.mock('@/features/auth/sessionStore', () => ({
  sessionStore: { read: () => Promise.resolve({ accessToken: 'token', refreshToken: 'refresh' }) },
}));

describe('ApiGenerationQuotaGateway', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.saraya.test';
    globalThis.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
  });

  it('loads server-authoritative quota using the authenticated sync endpoint', async () => {
    jest.mocked(globalThis.fetch).mockResolvedValue(Response.json(state));

    await expect(new ApiGenerationQuotaGateway().getQuota('free')).resolves.toEqual(state.quota);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.saraya.test/subscriptions/sync',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
      }),
    );
  });

  it('refreshes after server generation without consuming client-side quota', async () => {
    jest.mocked(globalThis.fetch).mockResolvedValue(Response.json(state));

    await expect(new ApiGenerationQuotaGateway().refreshAfterServerGeneration()).resolves.toEqual(
      state.quota,
    );
    await expect(new ApiGenerationQuotaGateway().consumeAfterSuccess('premium')).rejects.toThrow(
      'atomically',
    );
  });

  it('does not trust a client transaction ID when synchronizing a top-up', async () => {
    const before = { ...state, quota: { ...state.quota, topUpRemaining: 0 } };
    jest.mocked(globalThis.fetch)
      .mockResolvedValueOnce(Response.json(before))
      .mockResolvedValueOnce(Response.json(state));

    await expect(
      new ApiGenerationQuotaGateway().creditTopUp('premium', 'untrusted-client-id'),
    ).resolves.toMatchObject({ credited: true, quota: { topUpRemaining: 10 } });
    expect(JSON.stringify(jest.mocked(globalThis.fetch).mock.calls)).not.toContain(
      'untrusted-client-id',
    );
  });
});
