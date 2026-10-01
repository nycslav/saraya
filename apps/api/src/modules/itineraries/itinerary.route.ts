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
  router.use(authenticate);
  router.post('/generate', controller.generate);
  router.get('/', controller.list);
  router.post('/', controller.save);
  router.get('/:id', controller.get);
  router.delete('/:id', controller.delete);
  return router;
}

export const itineraryRouter = createItineraryRouter();
