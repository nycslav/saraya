import {
  festivalSummarySchema,
  type FestivalDetailWithCulture,
  type FestivalQuery,
  type FestivalSummary,
} from '@saraya/contracts';

import { hasDatabaseConfiguration } from '../../platform/database/pool';
import { PostgresFestivalRepository } from './festival.postgres-repository';
import { seedFestivals } from './festival.seed';

export interface FestivalRepository {
  findAll(query: FestivalQuery): Promise<FestivalSummary[]>;
  findUpcoming(query: FestivalQuery, currentMonth: number): Promise<FestivalSummary[]>;
  findById(id: string): Promise<FestivalDetailWithCulture | null>;
}

function matchesQuery(festival: FestivalDetailWithCulture, query: FestivalQuery) {
  const search = query.search?.toLocaleLowerCase() ?? '';
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
}

function summaries(festivals: FestivalDetailWithCulture[]) {
  return festivals.map((festival) => festivalSummarySchema.parse(festival));
}

export class InMemoryFestivalRepository implements FestivalRepository {
  constructor(private readonly festivals: FestivalDetailWithCulture[] = seedFestivals) {}

  async findAll(query: FestivalQuery) {
    return summaries(
      this.festivals
        .filter((festival) => matchesQuery(festival, query))
        .sort((left, right) => left.name.localeCompare(right.name)),
    );
  }

  async findUpcoming(query: FestivalQuery, currentMonth: number) {
    return summaries(
      this.festivals
        .filter((festival) => matchesQuery(festival, query))
        .sort((left, right) => {
          const leftDistance = (left.typicalMonth - currentMonth + 12) % 12;
          const rightDistance = (right.typicalMonth - currentMonth + 12) % 12;
          return leftDistance - rightDistance || left.name.localeCompare(right.name);
        }),
    );
  }

  async findById(id: string) {
    return this.festivals.find((festival) => festival.id === id) ?? null;
  }
}

export function createFestivalRepository(): FestivalRepository {
  return process.env.NODE_ENV !== 'test' && hasDatabaseConfiguration()
    ? new PostgresFestivalRepository()
    : new InMemoryFestivalRepository();
}
