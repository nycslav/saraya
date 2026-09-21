import type { GeneratedItinerary } from '@saraya/contracts';

import { hasDatabaseConfiguration } from '../../platform/database/pool';
import { PostgresItineraryRepository } from './itinerary.postgres-repository';

export interface ItineraryRepository {
  save(itinerary: GeneratedItinerary): Promise<void>;
  findById(id: string): Promise<GeneratedItinerary | null>;
}

export class InMemoryItineraryRepository implements ItineraryRepository {
  private readonly itineraries = new Map<string, GeneratedItinerary>();

  async save(itinerary: GeneratedItinerary): Promise<void> {
    this.itineraries.set(itinerary.id, structuredClone(itinerary));
  }

  async findById(id: string): Promise<GeneratedItinerary | null> {
    const itinerary = this.itineraries.get(id);
    return itinerary ? structuredClone(itinerary) : null;
  }
}

export function createItineraryRepository(): ItineraryRepository {
  if (process.env.NODE_ENV !== 'test' && hasDatabaseConfiguration()) {
    return new PostgresItineraryRepository();
  }

  return new InMemoryItineraryRepository();
}
