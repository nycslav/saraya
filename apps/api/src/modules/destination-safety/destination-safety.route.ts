import { Router, type RequestHandler } from 'express';

import { requireAuthenticatedUser } from '../../platform/http/auth.middleware';
import {
  createDestinationSafetyController,
  type DestinationSafetyController,
} from './destination-safety.controller';

export function createDestinationSafetyRouter(
  authenticate: RequestHandler = requireAuthenticatedUser,
  controller: DestinationSafetyController = createDestinationSafetyController(),
) {
  const router = Router();
  router.get('/:destinationId/conditions', controller.conditions);
  router.post('/:destinationId/safety-subscription', authenticate, controller.subscribe);
  router.get('/:destinationId/safety-subscription', authenticate, controller.status);
  router.delete('/:destinationId/safety-subscription', authenticate, controller.unsubscribe);
  return router;
}

export const destinationSafetyRouter = createDestinationSafetyRouter();
