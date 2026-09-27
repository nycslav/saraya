import { Router, type RequestHandler } from 'express';

import { requireAuthenticatedUser } from '../../platform/http/auth.middleware';
import {
  createFestivalReminderController,
  type FestivalReminderController,
} from './festival-reminder.controller';

export function createFestivalReminderRouters(
  authenticate: RequestHandler = requireAuthenticatedUser,
  controller: FestivalReminderController = createFestivalReminderController(),
) {
  const festivalReminderRouter = Router();
  festivalReminderRouter.post('/:festivalId/reminder', authenticate, controller.create);
  festivalReminderRouter.get('/:festivalId/reminder', authenticate, controller.get);
  festivalReminderRouter.delete('/:festivalId/reminder', authenticate, controller.cancel);

  const festivalReminderListRouter = Router();
  festivalReminderListRouter.get('/', authenticate, controller.list);

  return { festivalReminderRouter, festivalReminderListRouter };
}

export const { festivalReminderRouter, festivalReminderListRouter } =
  createFestivalReminderRouters();
