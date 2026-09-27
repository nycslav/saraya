import type { UserProfile } from '@saraya/contracts';

import { AuthenticationError, invalidCredentials } from '../../src/modules/auth/auth.errors';
import type {
  AuthRepository,
  AuthUser,
  StoredRefreshToken,
} from '../../src/modules/auth/auth.repository';
import { AuthService } from '../../src/modules/auth/auth.service';
import { JwtAuthTokenService } from '../../src/modules/auth/auth.tokens';
import type {
  GoogleTokenVerifier,
  VerifiedGoogleIdentity,
} from '../../src/modules/auth/google-token-verifier';

const accessSecret = 'access-secret-that-is-at-least-32-characters';
const refreshSecret = 'refresh-secret-that-is-at-least-32-characters';

const profile: UserProfile = {
  id: 'user-1',
  email: 'traveler@example.com',
  displayName: 'Saraya Traveler',
  avatarUrl: null,
  homeRegion: 'Central Visayas',
  travelStyle: 'culture',
  budget: 'moderate',
  interests: ['heritage'],
  preferredRegions: ['Central Visayas'],
  onboardingComplete: true,
};

class InMemoryAuthRepository implements AuthRepository {
  user: AuthUser | null = { ...profile, googleSubject: null };
  readonly refreshTokens = new Map<string, StoredRefreshToken & { revoked: boolean }>();

  async findUserByEmail(email: string) {
    return this.user?.email.toLowerCase() === email.toLowerCase() ? this.user : null;
  }

  async linkGoogleSubject(userId: string, googleSubject: string, avatarUrl: string | null) {
    if (!this.user || this.user.id !== userId) return null;
    if (this.user.googleSubject && this.user.googleSubject !== googleSubject) return null;
    this.user = { ...this.user, googleSubject, avatarUrl: this.user.avatarUrl ?? avatarUrl };
    return this.user;
  }

  async storeRefreshToken(token: StoredRefreshToken) {
    this.refreshTokens.set(token.id, { ...token, revoked: false });
  }

  async consumeRefreshToken(id: string, userId: string, tokenHash: string) {
    const stored = this.refreshTokens.get(id);
    if (
      !stored || stored.revoked || stored.userId !== userId || stored.tokenHash !== tokenHash ||
      stored.expiresAt <= new Date()
    ) return null;
    stored.revoked = true;
    return this.user;
  }

  async revokeRefreshToken(id: string, userId: string, tokenHash: string) {
    const stored = this.refreshTokens.get(id);
    if (stored?.userId === userId && stored.tokenHash === tokenHash) stored.revoked = true;
  }
}

class StubGoogleVerifier implements GoogleTokenVerifier {
  constructor(private readonly identity: VerifiedGoogleIdentity | Error) {}

  async verify() {
    if (this.identity instanceof Error) throw this.identity;
    return this.identity;
  }
}

function createService(repository = new InMemoryAuthRepository(), identity?: VerifiedGoogleIdentity | Error) {
  const verifier = new StubGoogleVerifier(identity ?? {
    subject: 'google-subject-1',
    email: profile.email,
    avatarUrl: 'https://example.com/avatar.png',
  });
  const tokens = new JwtAuthTokenService(accessSecret, refreshSecret);
  return { repository, tokens, service: new AuthService(repository, verifier, tokens) };
}

describe('AuthService', () => {
  it('links a verified Google identity and returns the existing onboarded user', async () => {
    const { repository, tokens, service } = createService();
    const session = await service.loginWithGoogle('google-id-token');

    expect(session.user).toEqual(expect.objectContaining({
      id: profile.id,
      email: profile.email,
      onboardingComplete: true,
    }));
    expect(repository.user?.googleSubject).toBe('google-subject-1');
    expect(repository.refreshTokens.size).toBe(1);
    await expect(tokens.verifyAccessToken(session.accessToken)).resolves.toBe(profile.id);
  });

  it('rejects invalid Google proof and unknown Google accounts', async () => {
    const invalid = createService(
      new InMemoryAuthRepository(),
      invalidCredentials('The Google sign-in token is invalid or expired.'),
    );
    await expect(invalid.service.loginWithGoogle('invalid')).rejects.toMatchObject({
      code: 'INVALID_AUTHENTICATION', status: 401,
    });

    const repository = new InMemoryAuthRepository();
    repository.user = null;
    await expect(createService(repository).service.loginWithGoogle('valid')).rejects.toMatchObject({
      code: 'ACCOUNT_NOT_FOUND', status: 403,
    });
  });

  it('rotates refresh tokens and rejects replay of the consumed token', async () => {
    const { service } = createService();
    const first = await service.loginWithGoogle('google-id-token');
    const second = await service.refresh(first.refreshToken);

    expect(second.refreshToken).not.toBe(first.refreshToken);
    await expect(service.refresh(first.refreshToken)).rejects.toBeInstanceOf(AuthenticationError);
    await expect(service.refresh(second.refreshToken)).resolves.toEqual(
      expect.objectContaining({ user: expect.objectContaining({ id: profile.id }) }),
    );
  });

  it('revokes the refresh token on logout', async () => {
    const { service } = createService();
    const session = await service.loginWithGoogle('google-id-token');
    await service.logout(session.refreshToken);
    await expect(service.refresh(session.refreshToken)).rejects.toMatchObject({
      code: 'INVALID_AUTHENTICATION',
    });
  });
});
