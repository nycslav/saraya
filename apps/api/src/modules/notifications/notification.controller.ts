import type { NextFunction, Request, Response } from 'express';

import { NotificationService } from './notification.service';

export type NotificationController = ReturnType<typeof createNotificationController>;

export function createNotificationController(service = new NotificationService()) {
  return {
    async register(request: Request, response: Response, next: NextFunction) {
      try {
        response.status(201).json(await service.registerDevice(response.locals.authenticatedUserId, request.body));
      } catch (error) { next(error); }
    },
    async unregister(request: Request, response: Response, next: NextFunction) {
      try {
        await service.unregisterDevice(response.locals.authenticatedUserId, request.body);
        response.status(204).send();
      } catch (error) { next(error); }
    },
    async getPreferences(_request: Request, response: Response, next: NextFunction) {
      try { response.json(await service.getPreferences(response.locals.authenticatedUserId)); }
      catch (error) { next(error); }
    },
    async updatePreferences(request: Request, response: Response, next: NextFunction) {
      try { response.json(await service.updatePreferences(response.locals.authenticatedUserId, request.body)); }
      catch (error) { next(error); }
    },
  };
}
