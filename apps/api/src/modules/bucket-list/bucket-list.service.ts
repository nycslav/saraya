import { randomUUID } from 'node:crypto';

import {
  createBucketListItemSchema,
  updateBucketListItemSchema,
} from '@saraya/contracts';

import {
  createDestinationRepository,
  type DestinationRepository,
} from '../destinations/destination.repository';
import {
  BucketListDestinationNotFoundError,
  BucketListDuplicateError,
  BucketListItemNotFoundError,
} from './bucket-list.errors';
import {
  createBucketListRepository,
  type BucketListRepository,
} from './bucket-list.repository';

export class BucketListService {
  constructor(
    private readonly repository: BucketListRepository = createBucketListRepository(),
    private readonly destinations: DestinationRepository = createDestinationRepository(),
  ) {}

  list(userId: string) {
    return this.repository.findAll(userId);
  }

  async create(userId: string, rawItem: unknown) {
    const item = createBucketListItemSchema.parse(rawItem);
    const destination = await this.destinations.findById(item.destinationId);
    if (!destination) {
      throw new BucketListDestinationNotFoundError('Destination not found.');
    }

    if (await this.repository.findByDestination(userId, item.destinationId)) {
      throw new BucketListDuplicateError('Destination is already in the bucket list.');
    }

    return this.repository.create(userId, randomUUID(), item);
  }

  async update(userId: string, id: string, rawChanges: unknown) {
    const changes = updateBucketListItemSchema.parse(rawChanges);
    const item = await this.repository.update(userId, id, changes);
    if (!item) {
      throw new BucketListItemNotFoundError('Bucket-list item not found.');
    }
    return item;
  }

  async delete(userId: string, id: string) {
    if (!(await this.repository.delete(userId, id))) {
      throw new BucketListItemNotFoundError('Bucket-list item not found.');
    }
  }
}
