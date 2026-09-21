import {
  createBucketListItemSchema,
  updateBucketListItemSchema,
  type BucketListItem,
  type CreateBucketListItemInput,
  type UpdateBucketListItemInput,
} from '@saraya/contracts';
import { createApiClient } from '@saraya/api-client';

export interface BucketListGateway {
  list(): Promise<BucketListItem[]>;
  create(input: CreateBucketListItemInput): Promise<BucketListItem>;
  update(id: string, input: UpdateBucketListItemInput): Promise<BucketListItem>;
  delete(id: string): Promise<void>;
}

export class MockBucketListGateway implements BucketListGateway {
  private items: BucketListItem[] = [];

  async list() {
    return structuredClone(this.sortedItems());
  }

  async create(rawInput: CreateBucketListItemInput) {
    const input = createBucketListItemSchema.parse(rawInput);
    if (this.items.some(({ destinationId }) => destinationId === input.destinationId)) {
      throw new Error('Destination is already saved.');
    }

    const now = new Date().toISOString();
    const item: BucketListItem = {
      id: `bucket-${input.destinationId}`,
      userId: 'demo-user',
      destinationId: input.destinationId,
      priority: input.priority,
      personalNotes: input.personalNotes,
      status: input.status,
      addedAt: now,
      updatedAt: now,
    };
    this.items.push(item);
    return structuredClone(item);
  }

  async update(id: string, rawInput: UpdateBucketListItemInput) {
    const changes = updateBucketListItemSchema.parse(rawInput);
    const index = this.items.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Bucket-list item was not found.');

    const current = this.items[index]!;
    const updated: BucketListItem = {
      ...current,
      ...changes,
      updatedAt: new Date().toISOString(),
    };
    this.items[index] = updated;
    return structuredClone(updated);
  }

  async delete(id: string) {
    const index = this.items.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Bucket-list item was not found.');
    this.items.splice(index, 1);
  }

  private sortedItems() {
    const priorityOrder = { high: 0, medium: 1, low: 2 } as const;
    return [...this.items].sort((left, right) =>
      priorityOrder[left.priority] - priorityOrder[right.priority] ||
      right.addedAt.localeCompare(left.addedAt),
    );
  }
}

class ApiBucketListGateway implements BucketListGateway {
  private readonly client = createApiClient(
    process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000',
  );

  list() {
    return this.client.bucketList.list();
  }

  create(input: CreateBucketListItemInput) {
    return this.client.bucketList.create(input);
  }

  update(id: string, input: UpdateBucketListItemInput) {
    return this.client.bucketList.update(id, input);
  }

  delete(id: string) {
    return this.client.bucketList.delete(id);
  }
}

export const bucketListGateway: BucketListGateway =
  process.env.EXPO_PUBLIC_DATA_MODE === 'api'
    ? new ApiBucketListGateway()
    : new MockBucketListGateway();
