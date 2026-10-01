import type { RequestHandler } from 'express';

import { AuthenticationError, invalidCredentials } from '../../modules/auth/auth.errors';
import {
  createAuthTokenServiceFromEnvironment,
  type AuthTokenService,
} from '../../modules/auth/auth.tokens';
import { getPool } from '../database/pool';

declare global {
  namespace Express {
    interface Locals {
      authenticatedUserId: string;
    }
  }
}

function bearerToken(header: string | undefined) {
  const match = header?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}

export function createAuthenticationMiddleware(
  tokens: AuthTokenService,
  userExists: (userId: string) => Promise<boolean> = async () => true,
): RequestHandler {
  return async (request, response, next) => {
    const token = bearerToken(request.header('authorization'));
    if (!token) {
      response.status(401).json({
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to access this resource.' },
      });
      return;
    }

    try {
      const userId = await tokens.verifyAccessToken(token);
      if (!await userExists(userId)) throw invalidCredentials('Please sign in again.');
      response.locals.authenticatedUserId = userId;
      next();
    } catch (error) {
      if (!(error instanceof AuthenticationError)) return next(error);
      response.status(401).json({ error: { code: error.code, message: error.message } });
    }
  };
}

let defaultMiddleware: RequestHandler | undefined;

export const requireAuthenticatedUser: RequestHandler = (request, response, next) => {
  if (!bearerToken(request.header('authorization'))) {
    response.status(401).json({
      error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to access this resource.' },
    });
    return;
  }

  try {
    defaultMiddleware ??= createAuthenticationMiddleware(
      createAuthTokenServiceFromEnvironment(),
      async (userId) => !process.env.DATABASE_URL?.trim() || Boolean(
        (await getPool().query('SELECT 1 FROM users WHERE id = $1', [userId])).rowCount,
      ),
    );
    return defaultMiddleware(request, response, next);
  } catch (error) {
    next(error);
  }
};
