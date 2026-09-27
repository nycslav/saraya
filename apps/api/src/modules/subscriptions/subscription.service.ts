import { randomUUID } from 'node:crypto';

import type { SubscriptionState } from '@saraya/contracts';

import {
  HttpRevenueCatCustomerProvider,
  revenueCatWebhookEnvelopeSchema,
  type RevenueCatCustomerProvider,
} from '../../integrations/revenuecat';
import {
  createSubscriptionRepository,
  subscriptionConfiguration,
  type SubscriptionRepository,
} from './subscription.repository';

export class GenerationCancelledError extends Error {
  constructor() {
    super('Itinerary generation was cancelled.');
    this.name = 'GenerationCancelledError';
  }
}

export class SubscriptionService {
  constructor(
    private readonly repository: SubscriptionRepository = createSubscriptionRepository(),
    private readonly customerProvider: RevenueCatCustomerProvider =
      new HttpRevenueCatCustomerProvider(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  async getState(userId: string): Promise<SubscriptionState> {
    await this.repository.associateCustomer(userId, userId);
    return this.repository.getState(userId, this.now());
  }

  async synchronize(userId: string): Promise<SubscriptionState> {
    await this.repository.associateCustomer(userId, userId);
    const snapshot = await this.customerProvider.getCustomer(userId);
    await this.repository.synchronizeCustomer(userId, userId, snapshot, this.now());
    return this.repository.getState(userId, this.now());
  }

  handleWebhook(rawPayload: unknown) {
    const envelope = revenueCatWebhookEnvelopeSchema.parse(rawPayload);
    return this.repository.processWebhook(envelope.event, subscriptionConfiguration);
  }

  async withGenerationReservation<T>(
    userId: string,
    operation: () => Promise<T>,
    isCancelled: () => boolean = () => false,
  ): Promise<T> {
    const reservationId = randomUUID();
    await this.repository.reserveGeneration(userId, reservationId, this.now());
    try {
      const result = await operation();
      if (isCancelled()) throw new GenerationCancelledError();
      await this.repository.consumeReservation(reservationId, this.now());
      return result;
    } catch (error) {
      await this.repository.releaseReservation(reservationId, this.now());
      throw error;
    }
  }
}
