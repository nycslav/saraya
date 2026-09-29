import { Router } from 'express';

import { requireAuthenticatedUser } from '../../platform/http/auth.middleware';

import { listAchievements, listUserAchievements } from './achievement.controller';

export const achievementRouter = Router();
export const userAchievementRouter = Router();

achievementRouter.get('/', requireAuthenticatedUser, listAchievements);
userAchievementRouter.get('/', requireAuthenticatedUser, listUserAchievements);
