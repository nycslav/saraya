import { randomUUID } from 'node:crypto';

import type { Achievement, AchievementProgress, CheckIn, DestinationDetail } from '@saraya/contracts';

import {
  createDestinationRepository,
  type DestinationRepository,
} from '../destinations/destination.repository';
import {
  createCheckInRepository,
  type CheckInRepository,
} from '../check-ins/check-in.repository';
import {
  createAchievementRepository,
  type AchievementRepository,
} from './achievement.repository';

export class AchievementService {
  constructor(
    private readonly repository: AchievementRepository = createAchievementRepository(),
    private readonly checkIns: CheckInRepository = createCheckInRepository(),
    private readonly destinations: DestinationRepository = createDestinationRepository(),
  ) {}

  async listWithProgress(userId: string): Promise<AchievementProgress[]> {
    const [achievements, unlocked, visits] = await Promise.all([
      this.repository.findAll(),
      this.repository.findForUser(userId),
      this.checkIns.findAll(userId),
    ]);
    const destinationMap = await this.loadDestinations(visits);
    const unlockedMap = new Map(unlocked.map((entry) => [entry.achievementId, entry]));

    return achievements.map((achievement) => {
      const unlockedEntry = unlockedMap.get(achievement.id);
      return {
        ...achievement,
        progress: Math.min(this.calculateProgress(achievement, visits, destinationMap), achievement.threshold),
        isUnlocked: Boolean(unlockedEntry),
        unlockedAt: unlockedEntry?.unlockedAt ?? null,
      };
    });
  }

  async evaluate(userId: string, checkInId: string): Promise<Achievement[]> {
    const [achievements, unlocked, visits] = await Promise.all([
      this.repository.findAll(),
      this.repository.findForUser(userId),
      this.checkIns.findAll(userId),
    ]);
    const destinationMap = await this.loadDestinations(visits);
    const unlockedIds = new Set(unlocked.map((entry) => entry.achievementId));
    const newlyUnlocked = achievements.filter(
      (achievement) => !unlockedIds.has(achievement.id) &&
        this.calculateProgress(achievement, visits, destinationMap) >= achievement.threshold,
    );

    await Promise.all(newlyUnlocked.map((achievement) =>
      this.repository.unlock(userId, achievement.id, checkInId, randomUUID()),
    ));
    return newlyUnlocked;
  }

  private async loadDestinations(visits: CheckIn[]) {
    const ids = [...new Set(visits.map((entry) => entry.destinationId))];
    const destinations = await Promise.all(ids.map((id) => this.destinations.findById(id)));
    return new Map(
      destinations.filter((entry): entry is DestinationDetail => entry !== null).map((entry) => [entry.id, entry]),
    );
  }

  private calculateProgress(
    achievement: Achievement,
    visits: CheckIn[],
    destinations: Map<string, DestinationDetail>,
  ) {
    if (achievement.ruleType === 'total_visits') return visits.length;
    if (achievement.ruleType === 'destination_category') {
      return visits.filter((visit) =>
        destinations.get(visit.destinationId)?.category === achievement.destinationCategory,
      ).length;
    }
    if (achievement.ruleType === 'island_group') {
      return visits.filter((visit) =>
        destinations.get(visit.destinationId)?.islandGroup === achievement.islandGroup,
      ).length;
    }
    return new Set(visits.map((visit) => destinations.get(visit.destinationId)?.islandGroup).filter(Boolean)).size;
  }
}
