import jwt, { type JwtPayload } from 'jsonwebtoken';

import '../../platform/config/load-env';
import { invalidCredentials } from '../auth/auth.errors';

const issuer = 'saraya-api';
const audience = 'saraya-account-actions';
const lifetimeSeconds = 5 * 60;

export class AccountActionTokenService {
  constructor(private readonly secret = process.env.JWT_ACCESS_SECRET?.trim() ?? '') {
    if (secret.length < 32) throw new Error('JWT_ACCESS_SECRET must contain at least 32 characters.');
  }

  issue(userId: string) {
    const expiresAt = new Date(Date.now() + lifetimeSeconds * 1000);
    return {
      accountActionToken: jwt.sign({ tokenType: 'account-action' }, this.secret, {
        algorithm: 'HS256', subject: userId, issuer, audience, expiresIn: lifetimeSeconds,
      }),
      expiresAt: expiresAt.toISOString(),
    };
  }

  verify(token: string, expectedUserId: string) {
    try {
      const payload = jwt.verify(token, this.secret, {
        algorithms: ['HS256'], issuer, audience,
      }) as JwtPayload;
      if (payload.tokenType !== 'account-action' || payload.sub !== expectedUserId) {
        throw invalidCredentials('Please confirm your Google account again.');
      }
    } catch {
      throw invalidCredentials('Please confirm your Google account again.');
    }
  }
}
