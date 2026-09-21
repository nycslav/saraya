import {
  achievementProgressSchema,
  bucketListItemSchema,
  checkInSchema,
  createCheckInResultSchema,
  createCheckInSchema,
  createBucketListItemSchema,
  destinationDetailSchema,
  destinationSummarySchema,
  generatedItinerarySchema,
  journeyEntrySchema,
  journeyStatisticsSchema,
  updateBucketListItemSchema,
  updateCheckInSchema,
  photoUploadResultSchema,
  type CreateBucketListItemInput,
  type CreateCheckInInput,
  type DiscoveryQuery,
  type GeneratedItinerary,
  type TripPreferences,
  type UpdateBucketListItemInput,
  type UpdateCheckInInput,
} from '@saraya/contracts';
import { z } from 'zod';

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export function createApiClient(baseUrl: string, getAccessToken?: () => Promise<string | null>) {
  const request = async (path: string, init?: RequestInit) => {
    const token = await getAccessToken?.();
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
    if (!response.ok) throw new ApiClientError(await readErrorMessage(response), response.status);
    return response.status === 204 ? null : response.json() as Promise<unknown>;
  };

  const upload = async (path: string, body: FormData) => {
    const token = await getAccessToken?.();
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
      method: 'POST',
      body,
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) throw new ApiClientError(await readErrorMessage(response), response.status);
    return response.json() as Promise<unknown>;
  };

  return {
    destinations: {
      async list(query: DiscoveryQuery) {
        const params = new URLSearchParams();
        if (query.search) params.set('search', query.search);
        if (query.islandGroup) params.set('islandGroup', query.islandGroup);
        if (query.interest) params.set('interest', query.interest);
        const data = await request(`/destinations?${params.toString()}`);
        return z.array(destinationSummarySchema).parse(data);
      },
      async getById(id: string) {
        return destinationDetailSchema.parse(await request(`/destinations/${encodeURIComponent(id)}`));
      },
    },
    bucketList: {
      async list() {
        return z.array(bucketListItemSchema).parse(await request('/bucket-list'));
      },
      async create(input: CreateBucketListItemInput) {
        const item = createBucketListItemSchema.parse(input);
        return bucketListItemSchema.parse(await request('/bucket-list', {
          method: 'POST',
          body: JSON.stringify(item),
        }));
      },
      async update(id: string, input: UpdateBucketListItemInput) {
        const changes = updateBucketListItemSchema.parse(input);
        return bucketListItemSchema.parse(await request(
          `/bucket-list/${encodeURIComponent(id)}`,
          { method: 'PATCH', body: JSON.stringify(changes) },
        ));
      },
      async delete(id: string) {
        await request(`/bucket-list/${encodeURIComponent(id)}`, { method: 'DELETE' });
      },
    },
    checkIns: {
      async list() {
        return z.array(checkInSchema).parse(await request('/check-ins'));
      },
      async timeline() {
        return z.array(journeyEntrySchema).parse(await request('/check-ins/timeline'));
      },
      async statistics() {
        return journeyStatisticsSchema.parse(await request('/check-ins/statistics'));
      },
      async create(input: CreateCheckInInput) {
        const checkIn = createCheckInSchema.parse(input);
        return createCheckInResultSchema.parse(await request('/check-ins', {
          method: 'POST', body: JSON.stringify(checkIn),
        }));
      },
      async update(id: string, input: UpdateCheckInInput) {
        const changes = updateCheckInSchema.parse(input);
        return checkInSchema.parse(await request(`/check-ins/${encodeURIComponent(id)}`, {
          method: 'PATCH', body: JSON.stringify(changes),
        }));
      },
      async delete(id: string) {
        await request(`/check-ins/${encodeURIComponent(id)}`, { method: 'DELETE' });
      },
      async uploadPhoto(form: FormData) {
        return photoUploadResultSchema.parse(await upload('/check-ins/photos', form));
      },
    },
    achievements: {
      async list() {
        return z.array(achievementProgressSchema).parse(await request('/achievements'));
      },
      async listUnlocked() {
        return z.array(achievementProgressSchema).parse(await request('/user/achievements'));
      },
    },
    itineraries: {
      async generate(preferences: TripPreferences, signal?: AbortSignal) {
        return generatedItinerarySchema.parse(await request('/itineraries/generate', {
          method: 'POST', body: JSON.stringify(preferences), signal,
        }));
      },
      async save(itinerary: GeneratedItinerary) {
        await request('/itineraries', { method: 'POST', body: JSON.stringify(itinerary) });
      },
      async getById(id: string) {
        return generatedItinerarySchema.parse(
          await request(`/itineraries/${encodeURIComponent(id)}`),
        );
      },
    },
  };
}

async function readErrorMessage(response: Response) {
  try {
    const payload = await response.json() as { error?: { message?: unknown } };
    if (typeof payload.error?.message === 'string') return payload.error.message;
  } catch {
    // Some infrastructure errors do not provide a JSON body.
  }
  return `Saraya API request failed with status ${response.status}.`;
}

export type SarayaApiClient = ReturnType<typeof createApiClient>;
