import type { UpdateProfileInput, UserProfile } from '@saraya/contracts';

export type AuthUser = UserProfile & { googleSubject: string | null };

export type StoredRefreshToken = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

export type NewGoogleUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  googleSubject: string;
};

export interface AuthRepository {
  findUserByGoogleSubject(googleSubject: string): Promise<AuthUser | null>;
  findUserByEmail(email: string): Promise<AuthUser | null>;
  createGoogleUser(user: NewGoogleUser): Promise<AuthUser | null>;
  linkGoogleSubject(userId: string, googleSubject: string, avatarUrl: string | null): Promise<AuthUser | null>;
  updateProfile(userId: string, changes: UpdateProfileInput): Promise<AuthUser | null>;
  storeRefreshToken(token: StoredRefreshToken): Promise<void>;
  consumeRefreshToken(id: string, userId: string, tokenHash: string): Promise<AuthUser | null>;
  revokeRefreshToken(id: string, userId: string, tokenHash: string): Promise<void>;
}
