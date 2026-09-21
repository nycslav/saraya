import {
  destinationSummarySchema,
  type DestinationDetail,
  type DestinationSummary,
  type DiscoveryQuery,
} from '@saraya/contracts';

import { hasDatabaseConfiguration } from '../../platform/database/pool';
import { PostgresDestinationRepository } from './destination.postgres-repository';
import { seedDestinations } from './destination.seed';

export interface DestinationRepository {
  findAll(query: DiscoveryQuery): Promise<DestinationSummary[]>;
  findById(id: string): Promise<DestinationDetail | null>;
}

export class InMemoryDestinationRepository implements DestinationRepository {
  async findAll(query: DiscoveryQuery): Promise<DestinationSummary[]> {
    const search = query.search.toLocaleLowerCase();
    const interest = query.interest?.toLocaleLowerCase();

    return seedDestinations
      .filter((destination) => {
        const searchable = [
          destination.name,
          destination.province,
          destination.region,
          destination.category,
          ...destination.tags,
        ]
          .join(' ')
          .toLocaleLowerCase();

        return (
          (!search || searchable.includes(search)) &&
          (!query.islandGroup || destination.islandGroup === query.islandGroup) &&
          (!interest || destination.tags.some((tag) => tag.toLocaleLowerCase() === interest))
        );
      })
      .map((destination) => destinationSummarySchema.parse(destination));
  }

  async findById(id: string): Promise<DestinationDetail | null> {
    return seedDestinations.find((destination) => destination.id === id) ?? null;
  }
}

export function createDestinationRepository(): DestinationRepository {
  if (process.env.NODE_ENV !== 'test' && hasDatabaseConfiguration()) {
    return new PostgresDestinationRepository();
  }

  return new InMemoryDestinationRepository();
}
