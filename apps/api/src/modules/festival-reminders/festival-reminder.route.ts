import { Router, type RequestHandler } from 'express';

import { requireNotificationUser } from '../notifications/notification.route';
import {
  createFestivalReminderController,
  type FestivalReminderController,
} from './festival-reminder.controller';

export function createFestivalReminderRouters(
  authenticate: RequestHandler = requireNotificationUser,
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
