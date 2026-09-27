import type { SafetyAlert } from '@saraya/contracts';

import { hasDatabaseConfiguration } from '../../platform/database/pool';
import { seedDestinations } from '../destinations/destination.seed';
import { affectsCoordinates } from '../safety-alerts/safety-alert.repository';
import { PostgresDestinationSafetySubscriptionRepository } from './destination-safety-subscription.postgres-repository';

export type OwnedDestinationSafetySubscription = {
  userId: string;
  destinationId: string;
  createdAt: string;
};

export interface DestinationSafetySubscriptionRepository {
  subscribe(userId: string, destinationId: string, now: string): Promise<OwnedDestinationSafetySubscription>;
  find(userId: string, destinationId: string): Promise<OwnedDestinationSafetySubscription | null>;
  unsubscribe(userId: string, destinationId: string): Promise<boolean>;
  findSubscriberUserIdsForAlert(alert: SafetyAlert): Promise<string[]>;
}

export class InMemoryDestinationSafetySubscriptionRepository
implements DestinationSafetySubscriptionRepository {
  private readonly subscriptions = new Map<string, OwnedDestinationSafetySubscription>();

  private key(userId: string, destinationId: string) {
    return `${userId}\u0000${destinationId}`;
  }

  async subscribe(userId: string, destinationId: string, now: string) {
    const key = this.key(userId, destinationId);
    const subscription = this.subscriptions.get(key) ?? { userId, destinationId, createdAt: now };
    this.subscriptions.set(key, subscription);
    return { ...subscription };
  }

  async find(userId: string, destinationId: string) {
    const subscription = this.subscriptions.get(this.key(userId, destinationId));
    return subscription ? { ...subscription } : null;
  }

  async unsubscribe(userId: string, destinationId: string) {
    return this.subscriptions.delete(this.key(userId, destinationId));
  }

  async findSubscriberUserIdsForAlert(alert: SafetyAlert) {
    return [...new Set([...this.subscriptions.values()]
      .filter(({ destinationId }) => {
        const destination = seedDestinations.find(({ id }) => id === destinationId);
        return destination && (alert.affectedArea
          ? affectsCoordinates(alert, destination.coordinates)
          : alert.affectedRegions.includes(destination.region));
      })
      .map(({ userId }) => userId))];
  }
}

export function createDestinationSafetySubscriptionRepository(): DestinationSafetySubscriptionRepository {
  return process.env.NODE_ENV !== 'test' && hasDatabaseConfiguration()
    ? new PostgresDestinationSafetySubscriptionRepository()
    : new InMemoryDestinationSafetySubscriptionRepository();
}
