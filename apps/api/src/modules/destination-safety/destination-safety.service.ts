import {
  destinationIdParamsSchema,
  destinationSafetySubscriptionSchema,
  destinationSafetySubscriptionRequestSchema,
  type SafetyAlert,
} from '@saraya/contracts';

import {
  createDestinationRepository,
  type DestinationRepository,
} from '../destinations/destination.repository';
import { NotificationService } from '../notifications/notification.service';
import { SafetyAlertService } from '../safety-alerts/safety-alert.service';
import {
  createDestinationSafetySubscriptionRepository,
  type DestinationSafetySubscriptionRepository,
} from './destination-safety-subscription.repository';

export class DestinationSafetyDestinationNotFoundError extends Error {
  constructor() {
    super('Destination not found.');
    this.name = 'DestinationSafetyDestinationNotFoundError';
  }
}

type SafetyNotificationSender = Pick<NotificationService, 'sendSafetyAlertNotification'>;

export class DestinationSafetyService {
  constructor(
    private readonly subscriptions: DestinationSafetySubscriptionRepository =
      createDestinationSafetySubscriptionRepository(),
    private readonly destinations: DestinationRepository = createDestinationRepository(),
    private readonly safety: SafetyAlertService = new SafetyAlertService(),
    private readonly notifications: SafetyNotificationSender = new NotificationService(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  private parseDestinationId(rawDestinationId: unknown) {
    return destinationIdParamsSchema.parse({ id: rawDestinationId }).id;
  }

  private async requireDestination(rawDestinationId: unknown) {
    const destinationId = this.parseDestinationId(rawDestinationId);
    if (!(await this.destinations.findById(destinationId))) {
      throw new DestinationSafetyDestinationNotFoundError();
    }
    return destinationId;
  }

  conditions(rawDestinationId: unknown) {
    return this.safety.destinationConditions(this.parseDestinationId(rawDestinationId));
  }

  async subscribe(userId: string, rawDestinationId: unknown, rawInput: unknown = {}) {
    destinationSafetySubscriptionRequestSchema.parse(rawInput);
    const destinationId = await this.requireDestination(rawDestinationId);
    const subscription = await this.subscriptions.subscribe(userId, destinationId, this.now().toISOString());
    return destinationSafetySubscriptionSchema.parse({
      destinationId,
      subscribed: true,
      createdAt: subscription.createdAt,
    });
  }

  async status(userId: string, rawDestinationId: unknown) {
    const destinationId = await this.requireDestination(rawDestinationId);
    const subscription = await this.subscriptions.find(userId, destinationId);
    return destinationSafetySubscriptionSchema.parse({
      destinationId,
      subscribed: Boolean(subscription),
      createdAt: subscription?.createdAt ?? null,
    });
  }

  async unsubscribe(userId: string, rawDestinationId: unknown) {
    const destinationId = await this.requireDestination(rawDestinationId);
    await this.subscriptions.unsubscribe(userId, destinationId);
  }

  async notifySubscribers(alert: SafetyAlert) {
    const userIds = await this.subscriptions.findSubscriberUserIdsForAlert(alert);
    return this.notifications.sendSafetyAlertNotification(userIds, alert);
  }
}
