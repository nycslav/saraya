import { randomUUID } from 'node:crypto';

import {
  deviceTokenRegistrationSchema,
  deviceTokenRemovalSchema,
  updateNotificationPreferencesSchema,
} from '@saraya/contracts';

import {
  ExpoPushNotificationProvider,
  type DeliveryResult,
  type NotificationMessage,
  type NotificationProvider,
} from '../../integrations/notifications';
import {
  createNotificationRepository,
  type NotificationRepository,
} from './notification.repository';

export class NotificationService {
  constructor(
    private readonly repository: NotificationRepository = createNotificationRepository(),
    private readonly provider: NotificationProvider = new ExpoPushNotificationProvider(),
  ) {}

  async registerDevice(userId: string, rawInput: unknown) {
    const input = deviceTokenRegistrationSchema.parse(rawInput);
    await this.repository.upsertToken(userId, randomUUID(), input.pushToken, input.platform);
    return { registered: true as const };
  }

  async unregisterDevice(userId: string, rawInput: unknown) {
    const input = deviceTokenRemovalSchema.parse(rawInput);
    return this.repository.deactivateToken(userId, input.pushToken);
  }

  getPreferences(userId: string) {
    return this.repository.getPreferences(userId);
  }

  async updatePreferences(userId: string, rawInput: unknown) {
    return this.repository.updatePreferences(userId, updateNotificationPreferencesSchema.parse(rawInput));
  }

  sendSafetyAlertNotification(userIds: string[], alert: {
    id: string; title: string; summary: string; severity?: 'green' | 'yellow' | 'red';
  }) {
    return this.dispatch(userIds, {
      title: alert.title,
      body: alert.summary,
      data: { type: 'safety_alert', alertId: alert.id, ...(alert.severity ? { severity: alert.severity } : {}) },
    });
  }

  sendFestivalReminderNotification(userIds: string[], festival: {
    id: string; name: string; reminderText: string;
  }) {
    return this.dispatch(userIds, {
      title: `${festival.name} is coming up`,
      body: festival.reminderText,
      data: { type: 'festival_reminder', festivalId: festival.id },
    });
  }

  private async dispatch(
    userIds: string[],
    notification: Omit<NotificationMessage, 'to'>,
  ): Promise<DeliveryResult[]> {
    const tokens = await this.repository.findEligibleTokens(userIds, notification.data.type);
    if (tokens.length === 0) return [];
    let results: DeliveryResult[];
    try {
      results = await this.provider.send(tokens.map((token) => ({ ...notification, to: token.pushToken })));
    } catch {
      // A provider implementation must not make domain workflows fail.
      return tokens.map((token) => ({
        pushToken: token.pushToken,
        status: 'failed',
        errorCode: 'PROVIDER_FAILURE',
        errorMessage: 'Notification provider failed.',
        shouldDeactivateToken: false,
      }));
    }
    const invalid = results.filter((result) => result.shouldDeactivateToken).map((result) => result.pushToken);
    await this.repository.deactivateTokens(invalid);
    return results;
  }
}
