import { createApiClient } from './index';

describe('account management API client', () => {
  afterEach(() => jest.restoreAllMocks());

  it('reauthenticates, downloads an export, and sends exact deletion confirmation', async () => {
    const archive = new Blob(['zip-data'], { type: 'application/zip' });
    const fetchMock = jest.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({
        accountActionToken: 'fresh-action-token',
        expiresAt: '2026-09-30T12:05:00.000Z',
      }))
      .mockResolvedValueOnce(new Response(archive, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const client = createApiClient('https://api.saraya.test', async () => 'access-token');

    const confirmation = await client.auth.reauthenticateAccount({ idToken: 'google-id-token' });
    await expect(client.auth.exportAccountData(confirmation.accountActionToken)).resolves.toBeInstanceOf(Blob);
    await expect(client.auth.deleteAccount({
      accountActionToken: confirmation.accountActionToken,
      confirmation: 'DELETE',
    })).resolves.toBeUndefined();

    expect(fetchMock.mock.calls[1]?.[1]).toEqual(expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer access-token',
        'x-account-action-token': 'fresh-action-token',
      }),
    }));
    expect(fetchMock.mock.calls[2]?.[1]).toEqual(expect.objectContaining({
      method: 'DELETE',
      body: JSON.stringify({ accountActionToken: 'fresh-action-token', confirmation: 'DELETE' }),
    }));
  });

  it('refreshes an expired access token once and retries the request', async () => {
    const refreshAccessToken = jest.fn().mockResolvedValue('fresh-access-token');
    const fetchMock = jest.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const client = createApiClient('https://api.saraya.test', {
      getAccessToken: async () => 'expired-access-token',
      refreshAccessToken,
    });

    await expect(client.auth.logout('refresh-token')).resolves.toBeUndefined();

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer fresh-access-token' }),
    }));
  });

  it('stops after one retry when the refreshed token is also rejected', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 401 }));
    const client = createApiClient('https://api.saraya.test', {
      getAccessToken: async () => 'expired-access-token',
      refreshAccessToken: async () => 'still-invalid-token',
    });

    await expect(client.auth.logout('refresh-token')).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
