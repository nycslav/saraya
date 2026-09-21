import {
  photoUploadResultSchema,
  type AchievementProgress,
  type CreateCheckInInput,
  type CreateCheckInResult,
  type JourneyEntry,
  type JourneyStatistics,
} from '@saraya/contracts';
import { ApiClientError, createApiClient } from '@saraya/api-client';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { destinationGateway } from '@/features/discovery/gateways';

export interface JourneyGateway {
  timeline(): Promise<JourneyEntry[]>;
  statistics(): Promise<JourneyStatistics>;
  achievements(): Promise<AchievementProgress[]>;
  create(input: CreateCheckInInput): Promise<CreateCheckInResult>;
  uploadPhoto(uri: string, mimeType?: string | null, fileName?: string | null): Promise<string>;
}

const mockEntries: JourneyEntry[] = [];
const mockUnlocked = new Map<string, string>();
const mockAchievements: AchievementProgress[] = [
  { id: 'first-story', title: 'First Story', description: 'Record your first Philippine travel memory.', icon: 'book-open', category: 'exploration', ruleType: 'total_visits', threshold: 1, destinationCategory: null, islandGroup: null, progress: 0, isUnlocked: false, unlockedAt: null },
  { id: 'trailblazer', title: 'Trailblazer', description: 'Record five destination visits.', icon: 'route', category: 'exploration', ruleType: 'total_visits', threshold: 5, destinationCategory: null, islandGroup: null, progress: 0, isUnlocked: false, unlockedAt: null },
  { id: 'beach-collector', title: 'Beach Collector', description: 'Visit three beach destinations.', icon: 'waves', category: 'nature', ruleType: 'destination_category', threshold: 3, destinationCategory: 'Beach', islandGroup: null, progress: 0, isUnlocked: false, unlockedAt: null },
  { id: 'heritage-explorer', title: 'Heritage Explorer', description: 'Visit three heritage destinations.', icon: 'landmark', category: 'culture', ruleType: 'destination_category', threshold: 3, destinationCategory: 'Heritage', islandGroup: null, progress: 0, isUnlocked: false, unlockedAt: null },
  { id: 'island-hopper', title: 'Island Hopper', description: 'Record visits in Luzon, Visayas, and Mindanao.', icon: 'map', category: 'exploration', ruleType: 'distinct_island_groups', threshold: 3, destinationCategory: null, islandGroup: null, progress: 0, isUnlocked: false, unlockedAt: null },
];

class MockJourneyGateway implements JourneyGateway {
  async timeline() { return structuredClone(mockEntries); }

  async statistics() {
    return {
      totalVisits: mockEntries.length,
      uniqueDestinations: new Set(mockEntries.map((entry) => entry.destinationId)).size,
      islandGroupsVisited: new Set(mockEntries.map((entry) => entry.islandGroup)).size,
      achievementsUnlocked: mockUnlocked.size,
    };
  }

  async achievements() {
    const categoryCount = (category: string) => mockEntries.filter((entry) => entry.destinationCategory === category).length;
    const islandGroups = new Set(mockEntries.map((entry) => entry.islandGroup)).size;
    return mockAchievements.map((achievement) => {
      const progress = achievement.ruleType === 'destination_category'
        ? categoryCount(achievement.destinationCategory ?? '')
        : achievement.ruleType === 'distinct_island_groups' ? islandGroups : mockEntries.length;
      const unlockedAt = mockUnlocked.get(achievement.id) ?? null;
      return { ...achievement, progress: Math.min(progress, achievement.threshold), isUnlocked: Boolean(unlockedAt), unlockedAt };
    });
  }

  async create(input: CreateCheckInInput) {
    const destination = await destinationGateway.getById(input.destinationId);
    if (!destination) throw new Error('Destination not found.');
    const now = new Date().toISOString();
    const checkIn = {
      id: `visit-${Date.now()}`,
      userId: 'demo-user',
      destinationId: destination.id,
      visitedAt: input.visitedAt ?? now,
      journalEntry: input.journalEntry ?? '',
      mood: input.mood ?? null,
      companions: input.companions ?? [],
      tags: input.tags ?? [],
      photoUrl: input.photoUrl ?? null,
      createdAt: now,
      updatedAt: now,
    };
    mockEntries.unshift({
      ...checkIn,
      destinationName: destination.name,
      province: destination.province,
      region: destination.region,
      islandGroup: destination.islandGroup,
      destinationCategory: destination.category,
      coordinates: destination.coordinates,
    });
    const newlyUnlockedAchievements = [];
    for (const achievement of await this.achievements()) {
      if (achievement.progress >= achievement.threshold && !achievement.isUnlocked) {
        mockUnlocked.set(achievement.id, now);
        newlyUnlockedAchievements.push(achievement);
      }
    }
    return { checkIn, newlyUnlockedAchievements };
  }

  async uploadPhoto(uri: string) { return uri; }
}

class ApiJourneyGateway implements JourneyGateway {
  private readonly baseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  private readonly client = createApiClient(this.baseUrl);

  timeline() { return this.client.checkIns.timeline(); }
  statistics() { return this.client.checkIns.statistics(); }
  achievements() { return this.client.achievements.list(); }
  create(input: CreateCheckInInput) { return this.client.checkIns.create(input); }

  async uploadPhoto(uri: string, mimeType?: string | null, fileName?: string | null) {
    const normalizedMimeType = mimeType === 'image/jpg' ? 'image/jpeg' : (mimeType ?? 'image/jpeg');
    if (Platform.OS !== 'web') {
      const response = await FileSystem.uploadAsync(`${this.baseUrl}/check-ins/photos`, uri, {
        fieldName: 'photo',
        httpMethod: 'POST',
        mimeType: normalizedMimeType,
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      });
      const payload = parseUploadResponse(response.body);
      if (response.status < 200 || response.status >= 300) {
        throw new ApiClientError(readUploadError(payload, response.status), response.status);
      }
      return photoUploadResultSchema.parse(payload).photoUrl;
    }

    const blob = await fetch(uri).then((response) => response.blob());
    const form = new FormData();
    form.append('photo', blob, fileName ?? `journey-${Date.now()}.jpg`);
    return (await this.client.checkIns.uploadPhoto(form)).photoUrl;
  }
}

function parseUploadResponse(body: string): unknown {
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

function readUploadError(payload: unknown, status: number) {
  if (
    typeof payload === 'object' && payload !== null && 'error' in payload &&
    typeof payload.error === 'object' && payload.error !== null && 'message' in payload.error &&
    typeof payload.error.message === 'string'
  ) {
    return payload.error.message;
  }
  return `Photo upload failed with status ${status}.`;
}

export const journeyGateway: JourneyGateway = process.env.EXPO_PUBLIC_DATA_MODE === 'api'
  ? new ApiJourneyGateway()
  : new MockJourneyGateway();

export function resolvePhotoUrl(photoUrl: string | null) {
  if (!photoUrl || !photoUrl.startsWith('/')) return photoUrl;
  return `${(process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '')}${photoUrl}`;
}
