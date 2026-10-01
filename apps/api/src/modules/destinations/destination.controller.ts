import type { NextFunction, Request, Response } from 'express';

import { DestinationService } from './destination.service';

const destinationService = new DestinationService();

export async function listDestinations(request: Request, response: Response, next: NextFunction) {
  try {
    response.json(await destinationService.list(request.query));
  } catch (error) {
    next(error);
  }
}

export async function getDestination(request: Request, response: Response, next: NextFunction) {
  try {
    const rawId = request.params.id;
    const id = Array.isArray(rawId) ? (rawId[0] ?? '') : (rawId ?? '');
    const destination = await destinationService.getById(id);

    if (!destination) {
      response.status(404).json({
        error: { code: 'DESTINATION_NOT_FOUND', message: 'Destination not found.' },
      });
      return;
    }

    response.json(destination);
  } catch (error) {
    next(error);
  }
}
