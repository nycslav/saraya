import { type LoginTicket, OAuth2Client } from 'google-auth-library';

import { GoogleOAuthTokenVerifier } from '../../src/modules/auth/google-token-verifier';

describe('GoogleOAuthTokenVerifier', () => {
  afterEach(() => jest.restoreAllMocks());

  it('verifies the ID token for the configured web client and returns verified identity fields', async () => {
    const verify = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken') as unknown as jest.Mock;
    verify.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-subject-1',
        email: 'traveler@example.com',
        email_verified: true,
        picture: 'https://example.com/avatar.png',
      }),
    } as LoginTicket);

    const identity = await new GoogleOAuthTokenVerifier('web-client.apps.googleusercontent.com')
      .verify('google-id-token');

    expect(verify).toHaveBeenCalledWith({
      idToken: 'google-id-token',
      audience: 'web-client.apps.googleusercontent.com',
    });
    expect(identity).toEqual({
      subject: 'google-subject-1',
      email: 'traveler@example.com',
      avatarUrl: 'https://example.com/avatar.png',
    });
  });

  it('rejects provider failures and Google identities without a verified email', async () => {
    const verify = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken') as unknown as jest.Mock;
    verify.mockRejectedValueOnce(new Error('bad proof'));
    await expect(new GoogleOAuthTokenVerifier('client-id').verify('invalid-token'))
      .rejects.toMatchObject({ code: 'INVALID_AUTHENTICATION', status: 401 });

    verify.mockResolvedValueOnce({
      getPayload: () => ({ sub: 'google-subject-1', email: 'traveler@example.com' }),
    } as LoginTicket);
    await expect(new GoogleOAuthTokenVerifier('client-id').verify('unverified-email-token'))
      .rejects.toMatchObject({ code: 'INVALID_AUTHENTICATION', status: 401 });
  });
});
