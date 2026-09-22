import type { NextFunction, Request, Response } from 'express';

import { SafetyAlertService, SafetyDestinationNotFoundError } from './safety-alert.service';

const safetyAlertService = new SafetyAlertService();

function handleKnownError(error: unknown, response: Response, next: NextFunction) {
  if (error instanceof SafetyDestinationNotFoundError) {
    response.status(404).json({
      error: { code: 'DESTINATION_NOT_FOUND', message: error.message },
    });
    return;
  }
  next(error);
}

export async function listSafetyAlerts(request: Request, response: Response, next: NextFunction) {
  try {
    response.json(await safetyAlertService.list(request.query));
  } catch (error) {
    handleKnownError(error, response, next);
  }
}

export async function getSafetyAlert(request: Request, response: Response, next: NextFunction) {
  try {
    const rawId = request.params.id;
    const id = Array.isArray(rawId) ? (rawId[0] ?? '') : (rawId ?? '');
    const alert = await safetyAlertService.getById(id);
    if (!alert) {
      response.status(404).json({
        error: { code: 'SAFETY_ALERT_NOT_FOUND', message: 'Safety alert not found.' },
      });
      return;
    }
    response.json(alert);
  } catch (error) {
    next(error);
  }
}

export async function getRegionalAlerts(request: Request, response: Response, next: NextFunction) {
  try {
    const rawRegion = request.params.region;
    const region = Array.isArray(rawRegion) ? (rawRegion[0] ?? '') : (rawRegion ?? '');
    response.json(await safetyAlertService.list({ ...request.query, region }));
  } catch (error) {
    handleKnownError(error, response, next);
  }
}

export async function getWeather(request: Request, response: Response, next: NextFunction) {
  try {
    response.json(await safetyAlertService.weather(request.query));
  } catch (error) {
    handleKnownError(error, response, next);
  }
}
