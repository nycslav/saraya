import type { GeneratedItinerary, SavedItinerarySummary } from '@saraya/contracts';

import { hasDatabaseConfiguration } from '../../platform/database/pool';
import { PostgresItineraryRepository } from './itinerary.postgres-repository';

export interface ItineraryRepository {
  save(userId: string, itinerary: GeneratedItinerary): Promise<boolean>;
  findAll(userId: string): Promise<SavedItinerarySummary[]>;
  findById(userId: string, id: string): Promise<GeneratedItinerary | null>;
  delete(userId: string, id: string): Promise<boolean>;
}

export class InMemoryItineraryRepository implements ItineraryRepository {
  private readonly itineraries = new Map<string, { userId: string; itinerary: GeneratedItinerary }>();

  async save(userId: string, itinerary: GeneratedItinerary): Promise<boolean> {
    const existing = this.itineraries.get(itinerary.id);
    if (existing && existing.userId !== userId) return false;
    this.itineraries.set(itinerary.id, { userId, itinerary: structuredClone(itinerary) });
    return true;
  }

  async findAll(userId: string): Promise<SavedItinerarySummary[]> {
    return [...this.itineraries.values()]
      .filter((entry) => entry.userId === userId)
      .map(({ itinerary }) => ({
        id: itinerary.id,
        destinationId: itinerary.destinationId,
        title: itinerary.title,
        subtitle: itinerary.subtitle,
        durationDays: itinerary.preferences.durationDays,
        budget: itinerary.preferences.budget,
        generatedAt: itinerary.generatedAt,
      }))
      .sort((left, right) => right.generatedAt.localeCompare(left.generatedAt));
  }

  async findById(userId: string, id: string): Promise<GeneratedItinerary | null> {
    const entry = this.itineraries.get(id);
    return entry?.userId === userId ? structuredClone(entry.itinerary) : null;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const entry = this.itineraries.get(id);
    if (!entry || entry.userId !== userId) return false;
    return this.itineraries.delete(id);
  }
}

export function createItineraryRepository(): ItineraryRepository {
  if (process.env.NODE_ENV !== 'test' && hasDatabaseConfiguration()) {
    return new PostgresItineraryRepository();
  }

  return new InMemoryItineraryRepository();
}
