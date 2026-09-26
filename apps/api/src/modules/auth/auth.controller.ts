import {
  googleLoginRequestSchema,
  refreshTokenRequestSchema,
} from '@saraya/contracts';
import type { RequestHandler } from 'express';

import { AuthService, createAuthService } from './auth.service';

export type AuthController = {
  google: RequestHandler;
  refresh: RequestHandler;
  logout: RequestHandler;
};

export function createAuthController(providedService?: AuthService): AuthController {
  let service = providedService;
  const getService = () => (service ??= createAuthService());

  return {
    google: async (request, response, next) => {
      try {
        const input = googleLoginRequestSchema.parse(request.body);
        response.json(await getService().loginWithGoogle(input.idToken));
      } catch (error) {
        next(error);
      }
    },
    refresh: async (request, response, next) => {
      try {
        const input = refreshTokenRequestSchema.parse(request.body);
        response.json(await getService().refresh(input.refreshToken));
      } catch (error) {
        next(error);
      }
    },
    logout: async (request, response, next) => {
      try {
        const input = refreshTokenRequestSchema.parse(request.body);
        await getService().logout(input.refreshToken);
        response.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  };
}
