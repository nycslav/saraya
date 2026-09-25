import type { NextFunction, Request, Response } from 'express';

import { FestivalService } from './festival.service';

const festivalService = new FestivalService();

export async function listFestivals(request: Request, response: Response, next: NextFunction) {
  try {
    response.json(await festivalService.list(request.query));
  } catch (error) {
    next(error);
  }
}

export async function listUpcomingFestivals(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    response.json(await festivalService.upcoming(request.query));
  } catch (error) {
    next(error);
  }
}

export async function getFestival(request: Request, response: Response, next: NextFunction) {
  try {
    const rawId = request.params.id;
    const festival = await festivalService.getById(
      Array.isArray(rawId) ? (rawId[0] ?? '') : (rawId ?? ''),
    );
    if (!festival) {
      response.status(404).json({
        error: { code: 'FESTIVAL_NOT_FOUND', message: 'Festival not found.' },
      });
      return;
    }
    response.json(festival);
  } catch (error) {
    next(error);
  }
}
