import type { NotificationPreferences, UpdateNotificationPreferences } from '@saraya/contracts';
import { Platform } from 'react-native';

import { getExpoPushToken, requestNotificationPermission } from '@/core/notifications/expo-notifications';
import { createAuthenticatedApiClient } from '@/features/auth/authenticated-api';

export interface NotificationGateway {
  getPreferences(): Promise<NotificationPreferences>;
  updatePreferences(changes: UpdateNotificationPreferences): Promise<NotificationPreferences>;
  enable(changes: UpdateNotificationPreferences): Promise<NotificationPreferences>;
  registerCurrentToken(pushToken: string): Promise<void>;
}
function client() { return createAuthenticatedApiClient(); }

export class ApiNotificationGateway implements NotificationGateway {
  getPreferences() { return client().notifications.getPreferences(); }
  updatePreferences(changes: UpdateNotificationPreferences) { return client().notifications.updatePreferences(changes); }
  async enable(changes: UpdateNotificationPreferences) {
    if (!await requestNotificationPermission()) {
      const disabled = Object.fromEntries(Object.keys(changes).map((key) => [key, false])) as UpdateNotificationPreferences;
      return client().notifications.updatePreferences(disabled);
    }
    await this.registerCurrentToken(await getExpoPushToken());
    return client().notifications.updatePreferences(changes);
  }
  async registerCurrentToken(pushToken: string) {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;
    await client().notifications.registerDevice({ pushToken, platform: Platform.OS });
  }
}
export const notificationGateway: NotificationGateway = new ApiNotificationGateway();
