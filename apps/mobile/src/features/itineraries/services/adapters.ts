import AsyncStorage from '@react-native-async-storage/async-storage';
import { createApiClient } from '@saraya/api-client';
import {
  tripPreferencesSchema,
  type GeneratedItinerary,
  type TripPreferences,
} from '@saraya/contracts';

import { getApiBaseUrl } from '@/core/config';

import type { ItineraryGateway, PendingItineraryStore } from '../gateways';

const PENDING_KEY = '@saraya/pending-itinerary';

export class ApiItineraryGateway implements ItineraryGateway {
  private get client() {
    return createApiClient(getApiBaseUrl());
  }

  generate(preferences: TripPreferences, signal?: AbortSignal) {
    return this.client.itineraries.generate(preferences, signal);
  }

  save(itinerary: GeneratedItinerary) {
    return this.client.itineraries.save(itinerary);
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
