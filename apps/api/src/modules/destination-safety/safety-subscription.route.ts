import { Router, type RequestHandler } from 'express';

import { requireAuthenticatedUser } from '../../platform/http/auth.middleware';
import { DestinationSafetyService } from './destination-safety.service';

export function createSafetySubscriptionRouter(
  authenticated: RequestHandler = requireAuthenticatedUser,
  service = new DestinationSafetyService(),
) {
  const router = Router();
  router.use(authenticated);
  router.get('/', async (request, response, next) => {
    try {
      response.json(await service.scopeStatus(response.locals.authenticatedUserId, request.query));
    } catch (error) { next(error); }
  });
  router.post('/', async (request, response, next) => {
    try {
      response.status(201).json(await service.subscribeScope(
        response.locals.authenticatedUserId, request.body,
      ));
    } catch (error) { next(error); }
  });
  router.delete('/', async (request, response, next) => {
    try {
      await service.unsubscribeScope(response.locals.authenticatedUserId, request.body);
      response.status(204).send();
    } catch (error) { next(error); }
  });
  return router;
}

export const safetySubscriptionRouter = createSafetySubscriptionRouter();
