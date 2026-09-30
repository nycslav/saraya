import type { NextFunction, Request, Response } from 'express';

import { GenerationQuotaExhaustedError } from '../subscriptions/subscription.repository';
import { GenerationCancelledError } from '../subscriptions/subscription.service';
import {
  InvalidGeneratedItineraryError,
  ItineraryDestinationNotFoundError,
  ItineraryService,
  SavedItineraryNotFoundError,
} from './itinerary.service';

export type ItineraryController = ReturnType<typeof createItineraryController>;

export function createItineraryController(itineraryService = new ItineraryService()) {
  return {
    list: async (_request: Request, response: Response, next: NextFunction) => {
      try {
        response.json(await itineraryService.list(response.locals.authenticatedUserId));
      } catch (error) {
        next(error);
      }
    },
    generate: async (request: Request, response: Response, next: NextFunction) => {
      let cancelled = request.aborted;
      response.once('close', () => {
        if (!response.writableEnded) cancelled = true;
      });
      try {
        response.json(
          await itineraryService.generateForUser(
            response.locals.authenticatedUserId,
            request.body,
            () => cancelled,
          ),
        );
      } catch (error) {
        if (error instanceof ItineraryDestinationNotFoundError) {
          response.status(404).json({
            error: { code: 'DESTINATION_NOT_FOUND', message: error.message },
          });
          return;
        }
        if (error instanceof InvalidGeneratedItineraryError) {
          response.status(502).json({
            error: { code: 'INVALID_GENERATED_ITINERARY', message: error.message },
          });
          return;
        }
        if (error instanceof GenerationQuotaExhaustedError) {
          response.status(402).json({
            error: { code: 'GENERATION_QUOTA_EXHAUSTED', message: error.message },
          });
          return;
        }
        if (error instanceof GenerationCancelledError) {
          response.status(499).json({
            error: { code: 'GENERATION_CANCELLED', message: error.message },
          });
          return;
        }
        next(error);
      }
    },
    save: async (request: Request, response: Response, next: NextFunction) => {
      try {
        response.status(201).json(
          await itineraryService.save(response.locals.authenticatedUserId, request.body),
        );
      } catch (error) {
        if (error instanceof InvalidGeneratedItineraryError) {
          response.status(400).json({
            error: { code: 'INVALID_ITINERARY', message: error.message },
          });
          return;
        }
        if (error instanceof SavedItineraryNotFoundError) {
          sendNotFound(response, error);
          return;
        }
        next(error);
      }
    },
    get: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const rawId = request.params.id;
        const id = Array.isArray(rawId) ? (rawId[0] ?? '') : (rawId ?? '');
        const itinerary = await itineraryService.getById(
          response.locals.authenticatedUserId,
          id,
        );
        if (!itinerary) {
          sendNotFound(response, new SavedItineraryNotFoundError('Saved itinerary not found.'));
          return;
        }
        response.json(itinerary);
      } catch (error) {
        next(error);
      }
    },
    delete: async (request: Request, response: Response, next: NextFunction) => {
      try {
        const rawId = request.params.id;
        const id = Array.isArray(rawId) ? (rawId[0] ?? '') : (rawId ?? '');
        await itineraryService.delete(response.locals.authenticatedUserId, id);
        response.status(204).send();
      } catch (error) {
        if (error instanceof SavedItineraryNotFoundError) {
          sendNotFound(response, error);
          return;
        }
        next(error);
      }
    },
  };
}

function sendNotFound(response: Response, error: SavedItineraryNotFoundError) {
  response.status(404).json({
    error: { code: 'ITINERARY_NOT_FOUND', message: error.message },
  });
}
