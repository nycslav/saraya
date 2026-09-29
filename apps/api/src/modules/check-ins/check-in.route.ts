import { Router } from 'express';

import { requireAuthenticatedUser } from '../../platform/http/auth.middleware';

import {
  createCheckIn,
  deleteCheckIn,
  getStatistics,
  listCheckIns,
  listMap,
  listTimeline,
  updateCheckIn,
} from './check-in.controller';
import { receiveCheckInPhoto, uploadCheckInPhoto } from './check-in.photo';

export const checkInRouter = Router();

checkInRouter.use(requireAuthenticatedUser);
checkInRouter.get('/', listCheckIns);
checkInRouter.get('/timeline', listTimeline);
checkInRouter.get('/map', listMap);
checkInRouter.get('/statistics', getStatistics);
checkInRouter.post('/photos', receiveCheckInPhoto, uploadCheckInPhoto);
checkInRouter.post('/', createCheckIn);
checkInRouter.patch('/:id', updateCheckIn);
checkInRouter.delete('/:id', deleteCheckIn);
