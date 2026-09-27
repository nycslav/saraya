import { Router, type RequestHandler } from 'express';

import { requireNotificationUser } from '../notifications/notification.route';
import {
  createItineraryController,
  type ItineraryController,
} from './itinerary.controller';

export function createItineraryRouter(
  authenticate: RequestHandler = requireNotificationUser,
  controller: ItineraryController = createItineraryController(),
) {
  const router = Router();
  router.post('/generate', authenticate, controller.generate);
  router.post('/', controller.save);
  router.get('/:id', controller.get);
  return router;
}

export const itineraryRouter = createItineraryRouter();
