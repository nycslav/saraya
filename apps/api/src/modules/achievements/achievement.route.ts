import { Router } from 'express';

import { listAchievements, listUserAchievements } from './achievement.controller';

export const achievementRouter = Router();
export const userAchievementRouter = Router();

achievementRouter.get('/', listAchievements);
userAchievementRouter.get('/', listUserAchievements);
