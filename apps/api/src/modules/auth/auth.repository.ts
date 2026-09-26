import type { UserProfile } from '@saraya/contracts';

export type AuthUser = UserProfile & { googleSubject: string | null };

export type StoredRefreshToken = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

export interface AuthRepository {
  findUserByEmail(email: string): Promise<AuthUser | null>;
  linkGoogleSubject(userId: string, googleSubject: string, avatarUrl: string | null): Promise<AuthUser | null>;
  storeRefreshToken(token: StoredRefreshToken): Promise<void>;
  consumeRefreshToken(id: string, userId: string, tokenHash: string): Promise<AuthUser | null>;
  revokeRefreshToken(id: string, userId: string, tokenHash: string): Promise<void>;
}
