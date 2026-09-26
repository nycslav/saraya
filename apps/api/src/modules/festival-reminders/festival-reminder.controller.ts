import type { NextFunction, Request, Response } from 'express';

import {
  FestivalReminderFestivalNotFoundError,
  FestivalReminderService,
  FestivalReminderUnavailableError,
} from './festival-reminder.service';

export type FestivalReminderController = ReturnType<typeof createFestivalReminderController>;

function festivalId(request: Request) {
  const rawId = request.params.festivalId;
  return Array.isArray(rawId) ? (rawId[0] ?? '') : (rawId ?? '');
}

function handleKnownError(error: unknown, response: Response, next: NextFunction) {
  if (error instanceof FestivalReminderFestivalNotFoundError) {
    response.status(404).json({ error: { code: 'FESTIVAL_NOT_FOUND', message: error.message } });
    return;
  }
  if (error instanceof FestivalReminderUnavailableError) {
    response.status(409).json({
      error: { code: 'FESTIVAL_REMINDER_UNAVAILABLE', message: error.message },
    });
    return;
  }
  next(error);
}

export function createFestivalReminderController(service = new FestivalReminderService()) {
  return {
    async create(request: Request, response: Response, next: NextFunction) {
      try {
        response.status(201).json(
          await service.create(
            response.locals.authenticatedUserId,
            festivalId(request),
            request.body,
          ),
        );
      } catch (error) {
        handleKnownError(error, response, next);
      }
    },
    async get(request: Request, response: Response, next: NextFunction) {
      try {
        response.json(
          await service.get(response.locals.authenticatedUserId, festivalId(request)),
        );
      } catch (error) {
        handleKnownError(error, response, next);
      }
    },
    async list(_request: Request, response: Response, next: NextFunction) {
      try {
        response.json(await service.list(response.locals.authenticatedUserId));
      } catch (error) {
        next(error);
      }
    },
    async cancel(request: Request, response: Response, next: NextFunction) {
      try {
        await service.cancel(response.locals.authenticatedUserId, festivalId(request));
        response.status(204).send();
      } catch (error) {
        handleKnownError(error, response, next);
      }
    },
  };
}
