import { Router, type RequestHandler } from 'express';

import { requireAuthenticatedUser } from '../../platform/http/auth.middleware';
import { createNotificationController } from './notification.controller';

export function createNotificationRouter(
  authenticate: RequestHandler = requireAuthenticatedUser,
  controller = createNotificationController(),
) {
  const router = Router();
  router.use(authenticate);
  router.post('/devices', controller.register);
  router.delete('/devices', controller.unregister);
  router.get('/preferences', controller.getPreferences);
  router.patch('/preferences', controller.updatePreferences);
  return router;
}

export const notificationRouter = createNotificationRouter();
