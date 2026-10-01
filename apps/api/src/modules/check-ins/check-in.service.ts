import { randomUUID } from 'node:crypto';

import {
  createCheckInSchema,
  updateCheckInSchema,
  type JourneyEntry,
} from '@saraya/contracts';

import { AchievementService } from '../achievements/achievement.service';
import {
  createDestinationRepository,
  type DestinationRepository,
} from '../destinations/destination.repository';
import {
  CheckInDestinationNotFoundError,
  CheckInDuplicateError,
  CheckInFutureDateError,
  CheckInNotFoundError,
} from './check-in.errors';
import { createCheckInRepository, type CheckInRepository } from './check-in.repository';

export class CheckInService {
  constructor(
    private readonly repository: CheckInRepository = createCheckInRepository(),
    private readonly destinations: DestinationRepository = createDestinationRepository(),
    private readonly achievements: AchievementService = new AchievementService(
      undefined,
      repository,
      destinations,
    ),
  ) {}

  list(userId: string) {
    return this.repository.findAll(userId);
  }

  async timeline(userId: string): Promise<JourneyEntry[]> {
    const visits = await this.repository.findAll(userId);
    return Promise.all(visits.map(async (visit) => {
      const destination = await this.destinations.findById(visit.destinationId);
      if (!destination) throw new CheckInDestinationNotFoundError('Destination not found.');
      return {
        ...visit,
        destinationName: destination.name,
        province: destination.province,
        region: destination.region,
        islandGroup: destination.islandGroup,
        destinationCategory: destination.category,
        coordinates: destination.coordinates,
      };
    }));
  }

  async statistics(userId: string) {
    const [timeline, achievements] = await Promise.all([
      this.timeline(userId),
      this.achievements.listWithProgress(userId),
    ]);
    return {
      totalVisits: timeline.length,
      uniqueDestinations: new Set(timeline.map((entry) => entry.destinationId)).size,
      islandGroupsVisited: new Set(timeline.map((entry) => entry.islandGroup)).size,
      achievementsUnlocked: achievements.filter((achievement) => achievement.isUnlocked).length,
    };
  }

  async create(userId: string, rawInput: unknown) {
    const input = createCheckInSchema.parse(rawInput);
    const visitedAt = input.visitedAt ?? new Date().toISOString();
    this.assertNotFuture(visitedAt);

    if (!(await this.destinations.findById(input.destinationId))) {
      throw new CheckInDestinationNotFoundError('Destination not found.');
    }
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    if (await this.repository.findRecent(userId, input.destinationId, fiveMinutesAgo)) {
      throw new CheckInDuplicateError('This visit was already recorded moments ago.');
    }

    const checkIn = await this.repository.create(userId, randomUUID(), { ...input, visitedAt });
    const newlyUnlockedAchievements = await this.achievements.evaluate(userId, checkIn.id);
    return { checkIn, newlyUnlockedAchievements };
  }

  async update(userId: string, id: string, rawInput: unknown) {
    const input = updateCheckInSchema.parse(rawInput);
    if (input.visitedAt) this.assertNotFuture(input.visitedAt);
    const result = await this.repository.update(userId, id, input);
    if (!result) throw new CheckInNotFoundError('Check-in not found.');
    return result;
  }

  async delete(userId: string, id: string) {
    if (!(await this.repository.delete(userId, id))) {
      throw new CheckInNotFoundError('Check-in not found.');
    }
  }

  private assertNotFuture(value: string) {
    if (new Date(value).getTime() > Date.now() + 60_000) {
      throw new CheckInFutureDateError('A visit cannot be recorded in the future.');
    }
  }
}
