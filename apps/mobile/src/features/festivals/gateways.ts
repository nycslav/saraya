import type { FestivalDetailWithCulture, FestivalQuery, FestivalSummary } from '@saraya/contracts';
import { ApiClientError, createApiClient } from '@saraya/api-client';

import { getApiBaseUrl } from '@/core/config';

import { mockFestivals } from './data/mockFestivals';

export interface FestivalGateway {
  list(query: FestivalQuery): Promise<FestivalSummary[]>;
  getById(id: string): Promise<FestivalDetailWithCulture | null>;
}

export class ApiFestivalGateway implements FestivalGateway {
  private get client() {
    return createApiClient(getApiBaseUrl());
  }

  list(query: FestivalQuery) {
    return this.client.festivals.upcoming(query);
  }

  async getById(id: string) {
    try {
      return await this.client.festivals.getById(id);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404) return null;
      throw error;
    }
  }
}

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export class FixtureFestivalGateway implements FestivalGateway {
  constructor(
    private readonly festivals: FestivalDetailWithCulture[] = mockFestivals,
    private readonly currentMonth = new Date().getMonth() + 1,
    private readonly delay = 100,
  ) {}

  async list(query: FestivalQuery): Promise<FestivalSummary[]> {
    if (this.delay > 0) await wait(this.delay);
    const search = query.search?.trim().toLocaleLowerCase() ?? '';

    return this.festivals
      .filter((festival) => {
        const searchable = [
          festival.name,
          festival.city,
          festival.province,
          festival.region,
          festival.category,
          ...festival.tags,
        ]
          .join(' ')
          .toLocaleLowerCase();

        return (
          (!search || searchable.includes(search)) &&
          (!query.region || festival.region === query.region) &&
          (!query.month || festival.typicalMonth === query.month)
        );
      })
      .sort((left, right) => {
        const leftDistance = (left.typicalMonth - this.currentMonth + 12) % 12;
        const rightDistance = (right.typicalMonth - this.currentMonth + 12) % 12;
        return leftDistance - rightDistance || left.name.localeCompare(right.name);
      });
  }

  async getById(id: string): Promise<FestivalDetailWithCulture | null> {
    if (this.delay > 0) await wait(this.delay);
    return this.festivals.find((festival) => festival.id === id) ?? null;
  }
}

/** @deprecated Use FixtureFestivalGateway for the curated offline demo adapter. */
export class MockFestivalGateway extends FixtureFestivalGateway {}

export const festivalGateway: FestivalGateway =
  process.env.EXPO_PUBLIC_DATA_MODE === 'api'
    ? new ApiFestivalGateway()
    : new FixtureFestivalGateway();
