import type { NextFunction, Request, Response } from 'express';

import { AchievementService } from './achievement.service';

const achievementService = new AchievementService();

export async function listAchievements(_request: Request, response: Response, next: NextFunction) {
  try {
    response.json(
      await achievementService.listWithProgress(response.locals.authenticatedUserId),
    );
  } catch (error) {
    next(error);
  }
}

export async function listUserAchievements(_request: Request, response: Response, next: NextFunction) {
  try {
    const achievements = await achievementService.listWithProgress(
      response.locals.authenticatedUserId,
    );
    response.json(achievements.filter((achievement) => achievement.isUnlocked));
  } catch (error) {
    next(error);
  }
}
