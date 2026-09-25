import { InMemoryNotificationRepository } from '../../src/modules/notifications/notification.repository';
import { NotificationService } from '../../src/modules/notifications/notification.service';
import type { NotificationProvider } from '../../src/integrations/notifications';

describe('NotificationService', () => {
  it('upserts, reassigns, lists, and deactivates tokens', async () => {
    const repository = new InMemoryNotificationRepository();
    const service = new NotificationService(repository, { send: jest.fn() });
    await service.registerDevice('user-1', { pushToken: 'ExpoPushToken[token1]', platform: 'android' });
    await service.registerDevice('user-2', { pushToken: 'ExpoPushToken[token1]', platform: 'ios' });
    expect(await repository.findActiveTokens('user-1')).toHaveLength(0);
    expect(await repository.findActiveTokens('user-2')).toEqual([expect.objectContaining({ platform: 'ios' })]);
    expect(await service.unregisterDevice('user-1', { pushToken: 'ExpoPushToken[token1]' })).toBe(false);
    expect(await service.unregisterDevice('user-2', { pushToken: 'ExpoPushToken[token1]' })).toBe(true);
  });

  it('delivers only enabled categories and deactivates invalid tokens', async () => {
    const repository = new InMemoryNotificationRepository();
    await repository.upsertToken('user-1', 'id-1', 'ExpoPushToken[valid]', 'android');
    await repository.upsertToken('user-2', 'id-2', 'ExpoPushToken[invalid]', 'android');
    await repository.updatePreferences('user-1', { safetyAlertsEnabled: true });
    await repository.updatePreferences('user-2', { safetyAlertsEnabled: true });
    const provider: NotificationProvider = { send: jest.fn(async (messages) => messages.map((message) => ({
      pushToken: message.to,
      status: message.to.includes('invalid') ? 'failed' as const : 'accepted' as const,
      shouldDeactivateToken: message.to.includes('invalid'),
    }))) };
    const service = new NotificationService(repository, provider);
    const results = await service.sendSafetyAlertNotification(['user-1', 'user-2'], { id: 'alert-1', title: 'Storm', summary: 'Stay inside.', severity: 'red' });
    expect(results).toHaveLength(2);
    expect(await repository.findActiveTokens('user-2')).toHaveLength(0);
    expect(await service.sendFestivalReminderNotification(['user-1'], { id: 'sinulog', name: 'Sinulog', reminderText: 'Tomorrow' })).toEqual([]);
  });

  it('normalizes a provider crash instead of failing the caller', async () => {
    const repository = new InMemoryNotificationRepository();
    await repository.upsertToken('user-1', 'id-1', 'ExpoPushToken[token1]', 'android');
    await repository.updatePreferences('user-1', { festivalRemindersEnabled: true });
    const service = new NotificationService(repository, { send: async () => { throw new Error('offline'); } });
    await expect(service.sendFestivalReminderNotification(['user-1'], { id: 'f', name: 'Festival', reminderText: 'Soon' }))
      .resolves.toEqual([expect.objectContaining({ status: 'failed', errorCode: 'PROVIDER_FAILURE' })]);
  });
});
