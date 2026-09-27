import { OAuth2Client } from 'google-auth-library';

import '../../platform/config/load-env';
import { AuthenticationError, invalidCredentials } from './auth.errors';

export type VerifiedGoogleIdentity = {
  subject: string;
  email: string;
  avatarUrl: string | null;
};

export interface GoogleTokenVerifier {
  verify(idToken: string): Promise<VerifiedGoogleIdentity>;
}

export class GoogleOAuthTokenVerifier implements GoogleTokenVerifier {
  private readonly client: OAuth2Client;

  constructor(private readonly clientId: string) {
    this.client = new OAuth2Client(clientId);
  }

  async verify(idToken: string) {
    try {
      const ticket = await this.client.verifyIdToken({ idToken, audience: this.clientId });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email || payload.email_verified !== true) {
        throw invalidCredentials('Google did not provide a verified email address.');
      }
      return {
        subject: payload.sub,
        email: payload.email,
        avatarUrl: payload.picture ?? null,
      };
    } catch (error) {
      if (error instanceof AuthenticationError) throw error;
      throw invalidCredentials('The Google sign-in token is invalid or expired.');
    }
  }
}

export function createGoogleTokenVerifierFromEnvironment() {
  const clientId = process.env.GOOGLE_WEB_CLIENT_ID?.trim();
  if (!clientId) throw new Error('GOOGLE_WEB_CLIENT_ID is required for Google authentication.');
  return new GoogleOAuthTokenVerifier(clientId);
}
