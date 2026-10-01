import type {
  DevicePlatform,
  NotificationCategory,
  NotificationPreferences,
  UpdateNotificationPreferences,
} from '@saraya/contracts';

import { hasDatabaseConfiguration } from '../../platform/database/pool';
import { PostgresNotificationRepository } from './notification.postgres-repository';

export type DeviceToken = {
  id: string;
  userId: string;
  pushToken: string;
  platform: DevicePlatform;
  isActive: boolean;
};

export interface NotificationRepository {
  upsertToken(userId: string, id: string, pushToken: string, platform: DevicePlatform): Promise<void>;
  deactivateToken(userId: string, pushToken: string): Promise<boolean>;
  deactivateTokens(pushTokens: string[]): Promise<void>;
  findActiveTokens(userId: string): Promise<DeviceToken[]>;
  findEligibleTokens(userIds: string[], category: NotificationCategory): Promise<DeviceToken[]>;
  getPreferences(userId: string): Promise<NotificationPreferences>;
  updatePreferences(userId: string, changes: UpdateNotificationPreferences): Promise<NotificationPreferences>;
}

const defaults: NotificationPreferences = {
  safetyAlertsEnabled: false,
  festivalRemindersEnabled: false,
};

export class InMemoryNotificationRepository implements NotificationRepository {
  private readonly tokens = new Map<string, DeviceToken>();
  private readonly preferences = new Map<string, NotificationPreferences>();

  async upsertToken(userId: string, id: string, pushToken: string, platform: DevicePlatform) {
    const existing = this.tokens.get(pushToken);
    this.tokens.set(pushToken, { id: existing?.id ?? id, userId, pushToken, platform, isActive: true });
  }

  async deactivateToken(userId: string, pushToken: string) {
    const token = this.tokens.get(pushToken);
    if (!token || token.userId !== userId) return false;
    token.isActive = false;
    return true;
  }

  async deactivateTokens(pushTokens: string[]) {
    pushTokens.forEach((pushToken) => {
      const token = this.tokens.get(pushToken);
      if (token) token.isActive = false;
    });
  }

  async findActiveTokens(userId: string) {
    return [...this.tokens.values()].filter((token) => token.userId === userId && token.isActive);
  }

  async findEligibleTokens(userIds: string[], category: NotificationCategory) {
    const enabled = category === 'safety_alert' ? 'safetyAlertsEnabled' : 'festivalRemindersEnabled';
    return [...this.tokens.values()].filter((token) =>
      token.isActive && userIds.includes(token.userId) && Boolean(this.preferences.get(token.userId)?.[enabled]),
    );
  }

  async getPreferences(userId: string) {
    return { ...(this.preferences.get(userId) ?? defaults) };
  }

  async updatePreferences(userId: string, changes: UpdateNotificationPreferences) {
    const updated = { ...(this.preferences.get(userId) ?? defaults), ...changes };
    this.preferences.set(userId, updated);
    return { ...updated };
  }
}

const memoryRepository = new InMemoryNotificationRepository();

export function createNotificationRepository(): NotificationRepository {
  return process.env.NODE_ENV !== 'test' && hasDatabaseConfiguration()
    ? new PostgresNotificationRepository()
    : memoryRepository;
}
