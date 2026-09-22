import type { FestivalDetailWithCulture, FestivalQuery, FestivalSummary } from '@saraya/contracts';

import { mockFestivals } from './data/mockFestivals';

export interface FestivalGateway {
  list(query: FestivalQuery): Promise<FestivalSummary[]>;
  getById(id: string): Promise<FestivalDetailWithCulture | null>;
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

export const festivalGateway: FestivalGateway = new FixtureFestivalGateway();
