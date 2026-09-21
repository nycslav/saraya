import type { NextFunction, Request, Response } from 'express';

import {
  CheckInDestinationNotFoundError,
  CheckInDuplicateError,
  CheckInFutureDateError,
  CheckInNotFoundError,
} from './check-in.errors';
import { CheckInService } from './check-in.service';

const service = new CheckInService();
const demoUserId = 'demo-user';

export async function listCheckIns(_request: Request, response: Response, next: NextFunction) {
  try { response.json(await service.list(demoUserId)); } catch (error) { next(error); }
}

export async function listTimeline(_request: Request, response: Response, next: NextFunction) {
  try { response.json(await service.timeline(demoUserId)); } catch (error) { next(error); }
}

export async function listMap(_request: Request, response: Response, next: NextFunction) {
  try {
    const timeline = await service.timeline(demoUserId);
    response.json(timeline.map(({ id, destinationId, destinationName, visitedAt, coordinates }) =>
      ({ id, destinationId, destinationName, visitedAt, coordinates }),
    ));
  } catch (error) { next(error); }
}

export async function getStatistics(_request: Request, response: Response, next: NextFunction) {
  try { response.json(await service.statistics(demoUserId)); } catch (error) { next(error); }
}

export async function createCheckIn(request: Request, response: Response, next: NextFunction) {
  try {
    response.status(201).json(await service.create(demoUserId, request.body));
  } catch (error) {
    if (error instanceof CheckInDestinationNotFoundError) return sendError(response, 404, 'DESTINATION_NOT_FOUND', error.message);
    if (error instanceof CheckInDuplicateError) return sendError(response, 409, 'CHECK_IN_DUPLICATE', error.message);
    if (error instanceof CheckInFutureDateError) return sendError(response, 400, 'FUTURE_VISIT', error.message);
    next(error);
  }
}

export async function updateCheckIn(request: Request, response: Response, next: NextFunction) {
  try { response.json(await service.update(demoUserId, getId(request), request.body)); }
  catch (error) { handleMutationError(error, response, next); }
}

export async function deleteCheckIn(request: Request, response: Response, next: NextFunction) {
  try { await service.delete(demoUserId, getId(request)); response.status(204).send(); }
  catch (error) { handleMutationError(error, response, next); }
}

function getId(request: Request) {
  const value = request.params.id;
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function handleMutationError(error: unknown, response: Response, next: NextFunction) {
  if (error instanceof CheckInNotFoundError) return sendError(response, 404, 'CHECK_IN_NOT_FOUND', error.message);
  if (error instanceof CheckInFutureDateError) return sendError(response, 400, 'FUTURE_VISIT', error.message);
  next(error);
}

function sendError(response: Response, status: number, code: string, message: string) {
  response.status(status).json({ error: { code, message } });
}
