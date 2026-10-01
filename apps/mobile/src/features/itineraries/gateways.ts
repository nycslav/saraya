import type {
  GeneratedItinerary,
  SavedItinerarySummary,
  TripPreferences,
} from '@saraya/contracts';

export interface ItineraryGateway {
  list(): Promise<SavedItinerarySummary[]>;
  generate(preferences: TripPreferences, signal?: AbortSignal): Promise<GeneratedItinerary>;
  save(itinerary: GeneratedItinerary): Promise<void>;
  getById(id: string): Promise<GeneratedItinerary>;
  delete(id: string): Promise<void>;
}

export interface PendingItineraryStore {
  load(): Promise<TripPreferences | null>;
  save(preferences: TripPreferences): Promise<void>;
  clear(): Promise<void>;
}
