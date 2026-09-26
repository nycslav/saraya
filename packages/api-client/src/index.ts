import {
  achievementProgressSchema,
  authSessionSchema,
  bucketListItemSchema,
  checkInSchema,
  createBucketListItemSchema,
  createCheckInResultSchema,
  createCheckInSchema,
  createFestivalReminderSchema,
  destinationDetailSchema,
  destinationSummarySchema,
  festivalDetailWithCultureSchema,
  festivalReminderListSchema,
  festivalReminderSchema,
  festivalReminderStatusResponseSchema,
  festivalQuerySchema,
  festivalSummarySchema,
  generatedItinerarySchema,
  deviceTokenRegistrationResponseSchema,
  deviceTokenRegistrationSchema,
  deviceTokenRemovalSchema,
  journeyEntrySchema,
  journeyStatisticsSchema,
  photoUploadResultSchema,
  notificationPreferencesSchema,
  safetyAlertListResponseSchema,
  safetyAlertQuerySchema,
  safetyAlertSchema,
  updateBucketListItemSchema,
  updateCheckInSchema,
  updateNotificationPreferencesSchema,
  weatherQuerySchema,
  weatherResponseSchema,
  userProfileSchema,
  type CreateBucketListItemInput,
  type CreateCheckInInput,
  type CreateFestivalReminder,
  type GoogleLoginRequest,
  type DiscoveryQuery,
  type GeneratedItinerary,
  type FestivalQuery,
  type DeviceTokenRegistration,
  type DeviceTokenRemoval,
  type LoginRequest,
  type RegisterRequest,
  type TripPreferences,
  type UpdateProfileRequest,
  type UpdateNotificationPreferences,
  type UpdateBucketListItemInput,
  type UpdateCheckInInput,
  type SafetyAlertQuery,
  type WeatherQuery,
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
  const festivalParams = (input: FestivalQuery) => {
    const query = festivalQuerySchema.parse(input);
    const params = new URLSearchParams();
    if (query.search) params.set('search', query.search);
    if (query.region) params.set('region', query.region);
    if (query.month) params.set('month', String(query.month));
    return params;
  };
  const locationParams = (query: WeatherQuery | SafetyAlertQuery) => {
    const params = new URLSearchParams();
    if (query.latitude !== undefined) params.set('latitude', String(query.latitude));
    if (query.longitude !== undefined) params.set('longitude', String(query.longitude));
    if (query.region) params.set('region', query.region);
    if (query.destinationId) params.set('destinationId', query.destinationId);
    return params;
  };
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
    return response.status === 204 ? null : (response.json() as Promise<unknown>);
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

  const requestWithoutResponse = async (path: string, init?: RequestInit) => {
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
    if (!response.ok) throw new ApiClientError('Saraya API request failed.', response.status);
  };

  return {
    auth: {
      async login(input: LoginRequest) {
        return authSessionSchema.parse(
          await request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(input),
          }),
        );
      },
      async register(input: RegisterRequest) {
        return authSessionSchema.parse(
          await request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(input),
          }),
        );
      },
      async google(input: GoogleLoginRequest) {
        return authSessionSchema.parse(
          await request('/auth/google', {
            method: 'POST',
            body: JSON.stringify(input),
          }),
        );
      },
      async refresh(refreshToken: string) {
        return authSessionSchema.parse(
          await request('/auth/refresh', {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
          }),
        );
      },
      async logout(refreshToken: string) {
        await requestWithoutResponse('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      },
    },
    users: {
      async me() {
        return userProfileSchema.parse(await request('/users/me'));
      },
      async updateMe(input: UpdateProfileRequest) {
        return userProfileSchema.parse(
          await request('/users/me', {
            method: 'PATCH',
            body: JSON.stringify(input),
          }),
        );
      },
    },
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
        return destinationDetailSchema.parse(
          await request(`/destinations/${encodeURIComponent(id)}`),
        );
      },
    },
    festivals: {
      async list(input: FestivalQuery = {}) {
        const data = await request(`/festivals?${festivalParams(input).toString()}`);
        return z.array(festivalSummarySchema).parse(data);
      },
      async upcoming(input: FestivalQuery = {}) {
        const data = await request(`/festivals/upcoming?${festivalParams(input).toString()}`);
        return z.array(festivalSummarySchema).parse(data);
      },
      async getById(id: string) {
        return festivalDetailWithCultureSchema.parse(
          await request(`/festivals/${encodeURIComponent(id)}`),
        );
      },
      async createReminder(id: string, input: CreateFestivalReminder = { leadDays: 1 }) {
        const reminder = createFestivalReminderSchema.parse(input);
        return festivalReminderSchema.parse(
          await request(`/festivals/${encodeURIComponent(id)}/reminder`, {
            method: 'POST',
            body: JSON.stringify(reminder),
          }),
        );
      },
      async getReminder(id: string) {
        return festivalReminderStatusResponseSchema.parse(
          await request(`/festivals/${encodeURIComponent(id)}/reminder`),
        );
      },
      async cancelReminder(id: string) {
        await request(`/festivals/${encodeURIComponent(id)}/reminder`, { method: 'DELETE' });
      },
      async listReminders() {
        return festivalReminderListSchema.parse(await request('/festival-reminders'));
      },
    },
    notifications: {
      async registerDevice(input: DeviceTokenRegistration) {
        const registration = deviceTokenRegistrationSchema.parse(input);
        return deviceTokenRegistrationResponseSchema.parse(
          await request('/notifications/devices', {
            method: 'POST',
            body: JSON.stringify(registration),
          }),
        );
      },
      async unregisterDevice(input: DeviceTokenRemoval) {
        const removal = deviceTokenRemovalSchema.parse(input);
        await requestWithoutResponse('/notifications/devices', {
          method: 'DELETE',
          body: JSON.stringify(removal),
        });
      },
      async getPreferences() {
        return notificationPreferencesSchema.parse(await request('/notifications/preferences'));
      },
      async updatePreferences(input: UpdateNotificationPreferences) {
        const changes = updateNotificationPreferencesSchema.parse(input);
        return notificationPreferencesSchema.parse(
          await request('/notifications/preferences', {
            method: 'PATCH',
            body: JSON.stringify(changes),
          }),
        );
      },
    },
    safety: {
      async list(input: SafetyAlertQuery) {
        const query = safetyAlertQuerySchema.parse(input);
        const params = locationParams(query);
        if (query.severity) params.set('severity', query.severity);
        if (query.alertType) params.set('alertType', query.alertType);
        return safetyAlertListResponseSchema.parse(
          await request(`/safety-alerts?${params.toString()}`),
        );
      },
      async getById(id: string) {
        return safetyAlertSchema.parse(
          await request(`/safety-alerts/${encodeURIComponent(id)}`),
        );
      },
      async listByRegion(region: string) {
        return safetyAlertListResponseSchema.parse(
          await request(`/alerts/${encodeURIComponent(region)}`),
        );
      },
      async getWeather(input: WeatherQuery) {
        const query = weatherQuerySchema.parse(input);
        return weatherResponseSchema.parse(
          await request(`/weather?${locationParams(query).toString()}`),
        );
      },
    },
    bucketList: {
      async list() {
        return z.array(bucketListItemSchema).parse(await request('/bucket-list'));
      },
      async create(input: CreateBucketListItemInput) {
        const item = createBucketListItemSchema.parse(input);
        return bucketListItemSchema.parse(
          await request('/bucket-list', {
            method: 'POST',
            body: JSON.stringify(item),
          }),
        );
      },
      async update(id: string, input: UpdateBucketListItemInput) {
        const changes = updateBucketListItemSchema.parse(input);
        return bucketListItemSchema.parse(
          await request(`/bucket-list/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            body: JSON.stringify(changes),
          }),
        );
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
        return createCheckInResultSchema.parse(
          await request('/check-ins', {
            method: 'POST',
            body: JSON.stringify(checkIn),
          }),
        );
      },
      async update(id: string, input: UpdateCheckInInput) {
        const changes = updateCheckInSchema.parse(input);
        return checkInSchema.parse(
          await request(`/check-ins/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            body: JSON.stringify(changes),
          }),
        );
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
        return generatedItinerarySchema.parse(
          await request('/itineraries/generate', {
            method: 'POST',
            body: JSON.stringify(preferences),
            signal,
          }),
        );
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
    const payload = (await response.json()) as { error?: { message?: unknown } };
    if (typeof payload.error?.message === 'string') return payload.error.message;
  } catch {
    // Some infrastructure errors do not provide a JSON body.
  }
  return `Saraya API request failed with status ${response.status}.`;
}

export type SarayaApiClient = ReturnType<typeof createApiClient>;
