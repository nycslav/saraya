import type { QueryResultRow } from 'pg';

import { getPool } from '../../platform/database/pool';
import type { AuthRepository, AuthUser, StoredRefreshToken } from './auth.repository';

interface UserRow extends QueryResultRow {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  googleSubject: string | null;
  homeRegion: string | null;
  travelStyle: string | null;
  budget: string | null;
  interests: string[];
  preferredRegions: string[];
  onboardingComplete: boolean;
}

const userColumns = `
  id,
  email,
  display_name AS "displayName",
  avatar_url AS "avatarUrl",
  google_subject AS "googleSubject",
  home_region AS "homeRegion",
  travel_style AS "travelStyle",
  budget,
  interests,
  preferred_regions AS "preferredRegions",
  onboarding_complete AS "onboardingComplete"
`;

function toUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    googleSubject: row.googleSubject,
    homeRegion: row.homeRegion,
    travelStyle: row.travelStyle,
    budget: row.budget,
    interests: row.interests,
    preferredRegions: row.preferredRegions,
    onboardingComplete: row.onboardingComplete,
  };
}

export class PostgresAuthRepository implements AuthRepository {
  async findUserByEmail(email: string) {
    const result = await getPool().query<UserRow>(
      `SELECT ${userColumns} FROM users WHERE lower(email) = lower($1)`,
      [email],
    );
    return result.rows[0] ? toUser(result.rows[0]) : null;
  }

  async linkGoogleSubject(userId: string, googleSubject: string, avatarUrl: string | null) {
    const result = await getPool().query<UserRow>(
      `UPDATE users
       SET google_subject = $2,
           avatar_url = COALESCE(avatar_url, $3),
           updated_at = now()
       WHERE id = $1
         AND (google_subject IS NULL OR google_subject = $2)
         AND NOT EXISTS (
           SELECT 1 FROM users linked
           WHERE linked.google_subject = $2 AND linked.id <> $1
         )
       RETURNING ${userColumns}`,
      [userId, googleSubject, avatarUrl],
    );
    return result.rows[0] ? toUser(result.rows[0]) : null;
  }

  async storeRefreshToken(token: StoredRefreshToken) {
    await getPool().query(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [token.id, token.userId, token.tokenHash, token.expiresAt],
    );
  }

  async consumeRefreshToken(id: string, userId: string, tokenHash: string) {
    const result = await getPool().query<{ userId: string }>(
      `UPDATE refresh_tokens
       SET revoked_at = now()
       WHERE id = $1
         AND user_id = $2
         AND token_hash = $3
         AND revoked_at IS NULL
         AND expires_at > now()
       RETURNING user_id AS "userId"`,
      [id, userId, tokenHash],
    );
    if (!result.rows[0]) return null;

    const userResult = await getPool().query<UserRow>(
      `SELECT ${userColumns} FROM users WHERE id = $1`,
      [result.rows[0].userId],
    );
    return userResult.rows[0] ? toUser(userResult.rows[0]) : null;
  }

  async revokeRefreshToken(id: string, userId: string, tokenHash: string) {
    await getPool().query(
      `UPDATE refresh_tokens
       SET revoked_at = COALESCE(revoked_at, now())
       WHERE id = $1 AND user_id = $2 AND token_hash = $3`,
      [id, userId, tokenHash],
    );
  }
}
