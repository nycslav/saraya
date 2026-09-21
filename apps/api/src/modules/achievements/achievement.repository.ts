import type { Achievement, UserAchievement } from '@saraya/contracts';

import { hasDatabaseConfiguration } from '../../platform/database/pool';
import { PostgresAchievementRepository } from './achievement.postgres-repository';
import { seedAchievements } from './achievement.seed';

export interface AchievementRepository {
  findAll(): Promise<Achievement[]>;
  findForUser(userId: string): Promise<UserAchievement[]>;
  unlock(
    userId: string,
    achievementId: string,
    checkInId: string,
    id: string,
  ): Promise<UserAchievement>;
}

export class InMemoryAchievementRepository implements AchievementRepository {
  private readonly unlocked = new Map<string, UserAchievement>();

  async findAll() {
    return structuredClone(seedAchievements);
  }

  async findForUser(userId: string) {
    return [...this.unlocked.values()]
      .filter((entry) => entry.userId === userId)
      .sort((left, right) => right.unlockedAt.localeCompare(left.unlockedAt))
      .map((entry) => structuredClone(entry));
  }

  async unlock(userId: string, achievementId: string, checkInId: string, id: string) {
    const key = `${userId}:${achievementId}`;
    const existing = this.unlocked.get(key);
    if (existing) return structuredClone(existing);

    const entry: UserAchievement = {
      id,
      userId,
      achievementId,
      checkInId,
      unlockedAt: new Date().toISOString(),
    };
    this.unlocked.set(key, entry);
    return structuredClone(entry);
  }
}

const memoryRepository = new InMemoryAchievementRepository();

export function createAchievementRepository(): AchievementRepository {
  if (process.env.NODE_ENV !== 'test' && hasDatabaseConfiguration()) {
    return new PostgresAchievementRepository();
  }
  return memoryRepository;
}
