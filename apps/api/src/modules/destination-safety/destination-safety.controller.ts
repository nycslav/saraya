import type { NextFunction, Request, Response } from 'express';

import {
  DestinationSafetyDestinationNotFoundError,
  DestinationSafetyService,
} from './destination-safety.service';
import { SafetyDestinationNotFoundError } from '../safety-alerts/safety-alert.service';

export type DestinationSafetyController = ReturnType<typeof createDestinationSafetyController>;

const destinationId = (request: Request) => {
  const raw = request.params.destinationId;
  return Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '');
};

function handleKnownError(error: unknown, response: Response, next: NextFunction) {
  if (
    error instanceof DestinationSafetyDestinationNotFoundError ||
    error instanceof SafetyDestinationNotFoundError
  ) {
    response.status(404).json({ error: { code: 'DESTINATION_NOT_FOUND', message: error.message } });
    return;
  }
  next(error);
}

export function createDestinationSafetyController(service = new DestinationSafetyService()) {
  return {
    async conditions(request: Request, response: Response, next: NextFunction) {
      try {
        response.json(await service.conditions(destinationId(request)));
      } catch (error) {
        handleKnownError(error, response, next);
      }
    },
    async subscribe(request: Request, response: Response, next: NextFunction) {
      try {
        response.status(201).json(await service.subscribe(
          response.locals.authenticatedUserId,
          destinationId(request),
          request.body,
        ));
      } catch (error) {
        handleKnownError(error, response, next);
      }
    },
    async status(request: Request, response: Response, next: NextFunction) {
      try {
        response.json(await service.status(
          response.locals.authenticatedUserId,
          destinationId(request),
        ));
      } catch (error) {
        handleKnownError(error, response, next);
      }
    },
    async unsubscribe(request: Request, response: Response, next: NextFunction) {
      try {
        await service.unsubscribe(response.locals.authenticatedUserId, destinationId(request));
        response.status(204).send();
      } catch (error) {
        handleKnownError(error, response, next);
      }
    },
  };
}
