import { Router } from 'express';

import {
  getDestination,
  listDestinations,
} from './destination.controller';

export const destinationRouter = Router();

destinationRouter.get('/', listDestinations);
destinationRouter.get('/:id', getDestination);
