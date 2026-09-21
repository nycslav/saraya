import type { NextFunction, Request, Response } from 'express';

import {
  InvalidGeneratedItineraryError,
  ItineraryDestinationNotFoundError,
  ItineraryService,
} from './itinerary.service';

const itineraryService = new ItineraryService();

export async function generateItinerary(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    response.json(await itineraryService.generate(request.body));
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
    next(error);
  }
}

export async function saveItinerary(request: Request, response: Response, next: NextFunction) {
  try {
    response.status(201).json(await itineraryService.save(request.body));
  } catch (error) {
    if (error instanceof InvalidGeneratedItineraryError) {
      response.status(400).json({
        error: { code: 'INVALID_ITINERARY', message: error.message },
      });
      return;
    }
    next(error);
  }
}

export async function getItinerary(request: Request, response: Response, next: NextFunction) {
  try {
    const rawId = request.params.id;
    const id = Array.isArray(rawId) ? (rawId[0] ?? '') : (rawId ?? '');
    const itinerary = await itineraryService.getById(id);
    if (!itinerary) {
      response.status(404).json({
        error: { code: 'ITINERARY_NOT_FOUND', message: 'Itinerary not found.' },
      });
      return;
    }

    response.json(itinerary);
  } catch (error) {
    next(error);
  }
}
