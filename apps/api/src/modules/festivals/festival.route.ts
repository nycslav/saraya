import { Router } from 'express';

import {
  getFestival,
  listFestivals,
  listUpcomingFestivals,
} from './festival.controller';

export const festivalRouter = Router();

festivalRouter.get('/', listFestivals);
festivalRouter.get('/upcoming', listUpcomingFestivals);
festivalRouter.get('/:id', getFestival);
