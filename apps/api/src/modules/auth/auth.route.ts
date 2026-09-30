import { Router, type RequestHandler } from 'express';

import { receiveCheckInPhoto, uploadCheckInPhoto } from '../check-ins/check-in.photo';
import { requireAuthenticatedUser } from '../../platform/http/auth.middleware';

import { createAuthController, type AuthController } from './auth.controller';

export function createAuthRouter(
  controller: AuthController = createAuthController(),
  authenticated: RequestHandler = requireAuthenticatedUser,
) {
  const router = Router();
  router.post('/google', controller.google);
  router.post('/refresh', controller.refresh);
  router.post('/logout', controller.logout);
  router.patch('/profile', authenticated, controller.updateProfile);
  router.post('/profile/photo', authenticated, receiveCheckInPhoto, uploadCheckInPhoto);
  return router;
}

export const authRouter = createAuthRouter();
