import { Router } from 'express';

import { createAuthController, type AuthController } from './auth.controller';

export function createAuthRouter(controller: AuthController = createAuthController()) {
  const router = Router();
  router.post('/google', controller.google);
  router.post('/refresh', controller.refresh);
  router.post('/logout', controller.logout);
  return router;
}

export const authRouter = createAuthRouter();
