import type { NextFunction, Request, Response } from 'express';

import { AchievementService } from './achievement.service';

const achievementService = new AchievementService();
const demoUserId = 'demo-user';

export async function listAchievements(_request: Request, response: Response, next: NextFunction) {
  try {
    response.json(await achievementService.listWithProgress(demoUserId));
  } catch (error) {
    next(error);
  }
}

export async function listUserAchievements(_request: Request, response: Response, next: NextFunction) {
  try {
    const achievements = await achievementService.listWithProgress(demoUserId);
    response.json(achievements.filter((achievement) => achievement.isUnlocked));
  } catch (error) {
    next(error);
  }
}
