import { Router } from 'express';

import {
  getRegionalAlerts,
  getSafetyAlert,
  getWeather,
  listSafetyAlerts,
} from './safety-alert.controller';

export const safetyAlertRouter = Router();
export const regionalAlertRouter = Router();
export const weatherRouter = Router();

safetyAlertRouter.get('/', listSafetyAlerts);
safetyAlertRouter.get('/:id', getSafetyAlert);
regionalAlertRouter.get('/:region', getRegionalAlerts);
weatherRouter.get('/', getWeather);
