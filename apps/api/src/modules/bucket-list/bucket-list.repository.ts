import type {
  BucketListItem,
  CreateBucketListItem,
  UpdateBucketListItem,
} from '@saraya/contracts';

import { hasDatabaseConfiguration } from '../../platform/database/pool';
import { BucketListDuplicateError } from './bucket-list.errors';
import { PostgresBucketListRepository } from './bucket-list.postgres-repository';

export interface BucketListRepository {
  findAll(userId: string): Promise<BucketListItem[]>;
  findById(userId: string, id: string): Promise<BucketListItem | null>;
  findByDestination(userId: string, destinationId: string): Promise<BucketListItem | null>;
  create(userId: string, id: string, item: CreateBucketListItem): Promise<BucketListItem>;
  update(
    userId: string,
    id: string,
    changes: UpdateBucketListItem,
  ): Promise<BucketListItem | null>;
  delete(userId: string, id: string): Promise<boolean>;
}

const priorityOrder = { high: 0, medium: 1, low: 2 } as const;

export class InMemoryBucketListRepository implements BucketListRepository {
  private readonly items = new Map<string, BucketListItem>();

  async findAll(userId: string): Promise<BucketListItem[]> {
    return [...this.items.values()]
      .filter((item) => item.userId === userId)
      .sort(
        (left, right) =>
          priorityOrder[left.priority] - priorityOrder[right.priority] ||
          right.addedAt.localeCompare(left.addedAt),
      )
      .map((item) => structuredClone(item));
  }

  async findById(userId: string, id: string): Promise<BucketListItem | null> {
    const item = this.items.get(id);
    return item?.userId === userId ? structuredClone(item) : null;
  }

  async findByDestination(userId: string, destinationId: string): Promise<BucketListItem | null> {
    const item = [...this.items.values()].find(
      (candidate) =>
        candidate.userId === userId && candidate.destinationId === destinationId,
    );
    return item ? structuredClone(item) : null;
  }

  async create(
    userId: string,
    id: string,
    item: CreateBucketListItem,
  ): Promise<BucketListItem> {
    if (await this.findByDestination(userId, item.destinationId)) {
      throw new BucketListDuplicateError('Destination is already in the bucket list.');
    }

    const now = new Date().toISOString();
    const created = { id, userId, ...item, addedAt: now, updatedAt: now };
    this.items.set(id, created);
    return structuredClone(created);
  }

  async update(
    userId: string,
    id: string,
    changes: UpdateBucketListItem,
  ): Promise<BucketListItem | null> {
    const existing = await this.findById(userId, id);
    if (!existing) {
      return null;
    }

    const updated = { ...existing, ...changes, updatedAt: new Date().toISOString() };
    this.items.set(id, updated);
    return structuredClone(updated);
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const existing = await this.findById(userId, id);
    return existing ? this.items.delete(id) : false;
  }
}

export function createBucketListRepository(): BucketListRepository {
  if (process.env.NODE_ENV !== 'test' && hasDatabaseConfiguration()) {
    return new PostgresBucketListRepository();
  }

  return new InMemoryBucketListRepository();
}
