import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  tripPreferencesSchema,
  type GeneratedItinerary,
  type TripPreferences,
} from '@saraya/contracts';

import { createAuthenticatedApiClient } from '@/features/auth/authenticated-api';

import type { ItineraryGateway, PendingItineraryStore } from '../gateways';

const PENDING_KEY = '@saraya/pending-itinerary';

export class ApiItineraryGateway implements ItineraryGateway {
  private get client() {
    return createAuthenticatedApiClient();
  }

  list() {
    return this.client.itineraries.list();
  }

  generate(preferences: TripPreferences, signal?: AbortSignal) {
    return this.client.itineraries.generate(preferences, signal);
  }

  save(itinerary: GeneratedItinerary) {
    return this.client.itineraries.save(itinerary);
  }

  getById(id: string) {
    return this.client.itineraries.getById(id);
  }

  delete(id: string) {
    return this.client.itineraries.delete(id);
  }
}

export class AsyncPendingItineraryStore implements PendingItineraryStore {
  async load() {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = tripPreferencesSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  }

  async save(preferences: TripPreferences) {
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(preferences));
  }

  async clear() {
    await AsyncStorage.removeItem(PENDING_KEY);
  }
}

export const itineraryGateway: ItineraryGateway = new ApiItineraryGateway();
export const pendingItineraryStore: PendingItineraryStore = new AsyncPendingItineraryStore();
