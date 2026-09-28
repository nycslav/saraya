import { Router, type RequestHandler } from 'express';

import { requireAuthenticatedUser } from '../../platform/http/auth.middleware';
import {
  createSubscriptionController,
  type SubscriptionController,
} from './subscription.controller';

export function createSubscriptionRouter(
  authenticate: RequestHandler = requireAuthenticatedUser,
  controller: SubscriptionController = createSubscriptionController(),
) {
  const router = Router();
  router.get('/me', authenticate, controller.state);
  router.post('/sync', authenticate, controller.synchronize);
  return router;
}

export function createRevenueCatWebhookRouter(
  controller: SubscriptionController = createSubscriptionController(),
) {
  const router = Router();
  router.post('/', controller.webhook);
  return router;
}

export const subscriptionRouter = createSubscriptionRouter();
export const revenueCatWebhookRouter = createRevenueCatWebhookRouter();
