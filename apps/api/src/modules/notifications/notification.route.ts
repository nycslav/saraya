import { Router, type RequestHandler } from 'express';

import { createNotificationController } from './notification.controller';

declare global {
  namespace Express {
    interface Locals { authenticatedUserId: string }
  }
}

// Member 1's JWT middleware will populate res.locals.authenticatedUserId.
// Until then these sensitive routes fail closed instead of using demo-user.
export const requireNotificationUser: RequestHandler = (_request, response, next) => {
  if (!response.locals.authenticatedUserId) {
    response.status(401).json({
      error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to manage notifications.' },
    });
    return;
  }
  next();
};

export function createNotificationRouter(
  authenticate: RequestHandler = requireNotificationUser,
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
