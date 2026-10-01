import { achievementSchema, type Achievement } from '@saraya/contracts';
import { z } from 'zod';

import achievementSeedData from '../../../../../database/seeds/achievements.json';

export const seedAchievements: Achievement[] = z
  .array(achievementSchema)
  .min(1)
  .parse(achievementSeedData);
