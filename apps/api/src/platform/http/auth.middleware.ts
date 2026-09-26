import type { RequestHandler } from 'express';

import { AuthenticationError } from '../../modules/auth/auth.errors';
import {
  createAuthTokenServiceFromEnvironment,
  type AuthTokenService,
} from '../../modules/auth/auth.tokens';

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

export function createAuthenticationMiddleware(tokens: AuthTokenService): RequestHandler {
  return async (request, response, next) => {
    const token = bearerToken(request.header('authorization'));
    if (!token) {
      response.status(401).json({
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to access this resource.' },
      });
      return;
    }

    try {
      response.locals.authenticatedUserId = await tokens.verifyAccessToken(token);
      next();
    } catch (error) {
      if (!(error instanceof AuthenticationError)) return next(error);
      response.status(401).json({ error: { code: error.code, message: error.message } });
    }
  };
}

let defaultTokens: AuthTokenService | undefined;

export const requireAuthenticatedUser: RequestHandler = (request, response, next) => {
  try {
    defaultTokens ??= createAuthTokenServiceFromEnvironment();
    return createAuthenticationMiddleware(defaultTokens)(request, response, next);
  } catch (error) {
    next(error);
  }
};
