import { randomUUID } from 'node:crypto';

import jwt, { type JwtPayload } from 'jsonwebtoken';

import '../../platform/config/load-env';
import { invalidCredentials } from './auth.errors';

const issuer = 'saraya-api';
const audience = 'saraya-mobile';
const refreshLifetimeSeconds = 30 * 24 * 60 * 60;

export type RefreshTokenIdentity = { id: string; userId: string };

export interface AuthTokenService {
  issueAccessToken(userId: string): Promise<string>;
  issueRefreshToken(userId: string): Promise<{ token: string; id: string; expiresAt: Date }>;
  verifyAccessToken(token: string): Promise<string>;
  verifyRefreshToken(token: string): Promise<RefreshTokenIdentity>;
}

export class JwtAuthTokenService implements AuthTokenService {
  constructor(
    private readonly accessSecret: string,
    private readonly refreshSecret: string,
  ) {
    if (accessSecret.length < 32 || refreshSecret.length < 32) {
      throw new Error('JWT secrets must each contain at least 32 characters.');
    }
  }

  async issueAccessToken(userId: string) {
    return jwt.sign({ tokenType: 'access' }, this.accessSecret, {
      algorithm: 'HS256',
      subject: userId,
      issuer,
      audience,
      expiresIn: '15m',
    });
  }

  async issueRefreshToken(userId: string) {
    const id = randomUUID();
    const token = jwt.sign({ tokenType: 'refresh' }, this.refreshSecret, {
      algorithm: 'HS256',
      subject: userId,
      jwtid: id,
      issuer,
      audience,
      expiresIn: refreshLifetimeSeconds,
    });
    return { token, id, expiresAt: new Date(Date.now() + refreshLifetimeSeconds * 1000) };
  }

  async verifyAccessToken(token: string) {
    try {
      const payload = jwt.verify(token, this.accessSecret, {
        algorithms: ['HS256'], issuer, audience,
      }) as JwtPayload;
      if (payload.tokenType !== 'access' || !payload.sub) throw invalidCredentials();
      return payload.sub;
    } catch {
      throw invalidCredentials();
    }
  }

  async verifyRefreshToken(token: string) {
    try {
      const payload = jwt.verify(token, this.refreshSecret, {
        algorithms: ['HS256'], issuer, audience,
      }) as JwtPayload;
      if (payload.tokenType !== 'refresh' || !payload.sub || !payload.jti) {
        throw invalidCredentials();
      }
      return { id: payload.jti, userId: payload.sub };
    } catch {
      throw invalidCredentials();
    }
  }
}

export function createAuthTokenServiceFromEnvironment() {
  const accessSecret = process.env.JWT_ACCESS_SECRET?.trim() ?? '';
  const refreshSecret = process.env.JWT_REFRESH_SECRET?.trim() ?? '';
  return new JwtAuthTokenService(accessSecret, refreshSecret);
}
