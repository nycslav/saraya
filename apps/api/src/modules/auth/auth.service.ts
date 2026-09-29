import { createHash, randomUUID } from 'node:crypto';

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
    const email = identity.email.trim().toLowerCase();

    const linked = await this.repository.findUserByGoogleSubject(identity.subject);
    if (linked) {
      const updated = await this.repository.linkGoogleSubject(
        linked.id,
        identity.subject,
        identity.avatarUrl,
      );
      return this.createSession(updated ?? linked);
    }

    const existing = await this.repository.findUserByEmail(email);
    if (existing?.googleSubject && existing.googleSubject !== identity.subject) {
      throw invalidCredentials('This Saraya account is linked to a different Google account.');
    }
    if (existing) return this.createSession(await this.linkExistingUser(existing, identity));

    const created = await this.repository.createGoogleUser({
      id: `user-${randomUUID()}`,
      email,
      displayName: identity.displayName ?? email.split('@')[0]!,
      avatarUrl: identity.avatarUrl,
      googleSubject: identity.subject,
    });
    if (created) return this.createSession(created);

    // A concurrent first login may have inserted this identity first. Re-read the
    // unique Google subject/email instead of creating a duplicate account.
    const raced = await this.repository.findUserByGoogleSubject(identity.subject)
      ?? await this.repository.findUserByEmail(email);
    if (!raced || (raced.googleSubject && raced.googleSubject !== identity.subject)) {
      throw invalidCredentials('This Saraya account is linked to a different Google account.');
    }
    return this.createSession(await this.linkExistingUser(raced, identity));
  }

  private async linkExistingUser(
    user: AuthUser,
    identity: Awaited<ReturnType<GoogleTokenVerifier['verify']>>,
  ) {
    const linked = await this.repository.linkGoogleSubject(
      user.id,
      identity.subject,
      identity.avatarUrl,
    );
    if (!linked) throw invalidCredentials();
    return linked;
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
