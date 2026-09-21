import { Router } from 'express';

import {
  generateItinerary,
  getItinerary,
  saveItinerary,
} from './itinerary.controller';

export const itineraryRouter = Router();

itineraryRouter.post('/generate', generateItinerary);
itineraryRouter.post('/', saveItinerary);
itineraryRouter.get('/:id', getItinerary);
