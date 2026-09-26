import { createHash } from 'node:crypto';

import type { AuthSession } from '@saraya/contracts';

import { AuthenticationError, invalidCredentials } from './auth.errors';
import { PostgresAuthRepository } from './auth.postgres-repository';
import type { AuthRepository, AuthUser } from './auth.repository';
import { createAuthTokenServiceFromEnvironment, type AuthTokenService } from './auth.tokens';
import {
  createGoogleTokenVerifierFromEnvironment,
  type GoogleTokenVerifier,
} from './google-token-verifier';

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function publicUser(user: AuthUser) {
  const { googleSubject: _googleSubject, ...profile } = user;
  return profile;
}

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly googleVerifier: GoogleTokenVerifier,
    private readonly tokens: AuthTokenService,
  ) {}

  async loginWithGoogle(idToken: string): Promise<AuthSession> {
    const identity = await this.googleVerifier.verify(idToken);
    const existing = await this.repository.findUserByEmail(identity.email);
    if (!existing) {
      throw new AuthenticationError(
        'ACCOUNT_NOT_FOUND',
        'This Google account is not registered with Saraya.',
        403,
      );
    }
    if (existing.googleSubject && existing.googleSubject !== identity.subject) {
      throw invalidCredentials('This Saraya account is linked to a different Google account.');
    }

    const user = await this.repository.linkGoogleSubject(
      existing.id,
      identity.subject,
      identity.avatarUrl,
    );
    if (!user) throw invalidCredentials();
    return this.createSession(user);
  }

  async refresh(refreshToken: string): Promise<AuthSession> {
    const identity = await this.tokens.verifyRefreshToken(refreshToken);
    const user = await this.repository.consumeRefreshToken(
      identity.id,
      identity.userId,
      hashToken(refreshToken),
    );
    if (!user) throw invalidCredentials('The refresh token has already been used or revoked.');
    return this.createSession(user);
  }

  async logout(refreshToken: string) {
    const identity = await this.tokens.verifyRefreshToken(refreshToken);
    await this.repository.revokeRefreshToken(
      identity.id,
      identity.userId,
      hashToken(refreshToken),
    );
  }

  private async createSession(user: AuthUser): Promise<AuthSession> {
    const [accessToken, refresh] = await Promise.all([
      this.tokens.issueAccessToken(user.id),
      this.tokens.issueRefreshToken(user.id),
    ]);
    await this.repository.storeRefreshToken({
      id: refresh.id,
      userId: user.id,
      tokenHash: hashToken(refresh.token),
      expiresAt: refresh.expiresAt,
    });
    return { accessToken, refreshToken: refresh.token, user: publicUser(user) };
  }
}

export function createAuthService() {
  return new AuthService(
    new PostgresAuthRepository(),
    createGoogleTokenVerifierFromEnvironment(),
    createAuthTokenServiceFromEnvironment(),
  );
}
