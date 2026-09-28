import { Router, type RequestHandler } from 'express';

import { requireAuthenticatedUser } from '../../platform/http/auth.middleware';
import {
  createItineraryController,
  type ItineraryController,
} from './itinerary.controller';

export function createItineraryRouter(
  authenticate: RequestHandler = requireAuthenticatedUser,
  controller: ItineraryController = createItineraryController(),
) {
  const router = Router();
  router.post('/generate', authenticate, controller.generate);
  router.post('/', controller.save);
  router.get('/:id', controller.get);
  return router;
}

export const itineraryRouter = createItineraryRouter();
