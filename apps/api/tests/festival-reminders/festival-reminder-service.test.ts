import { InMemoryFestivalReminderRepository } from '../../src/modules/festival-reminders/festival-reminder.repository';
import {
  FestivalReminderFestivalNotFoundError,
  FestivalReminderService,
  FestivalReminderUnavailableError,
  reminderTime,
} from '../../src/modules/festival-reminders/festival-reminder.service';
import { InMemoryFestivalRepository } from '../../src/modules/festivals/festival.repository';
import { InMemoryNotificationRepository } from '../../src/modules/notifications/notification.repository';
import { NotificationService } from '../../src/modules/notifications/notification.service';
import type { NotificationProvider } from '../../src/integrations/notifications';

describe('FestivalReminderService', () => {
  it('creates one reminder only for a future confirmed occurrence', async () => {
    const repository = new InMemoryFestivalReminderRepository();
    const service = new FestivalReminderService(
      repository,
      new InMemoryFestivalRepository(),
      { sendFestivalReminderNotification: jest.fn() },
      () => new Date('2026-09-20T00:00:00.000Z'),
    );

    const created = await service.create('user-1', 'masskara', { leadDays: 1 });
    const duplicate = await service.create('user-1', 'masskara', { leadDays: 1 });
    expect(created.remindAt).toBe(reminderTime('2026-10-01', 1));
    expect(duplicate.id).toBe(created.id);
    await expect(service.list('user-1')).resolves.toHaveLength(1);
    await expect(service.list('user-2')).resolves.toEqual([]);
  });

  it('rejects missing, recurring, and no-longer-actionable festivals', async () => {
    const repository = new InMemoryFestivalReminderRepository();
    const festivals = new InMemoryFestivalRepository();
    const notifications = { sendFestivalReminderNotification: jest.fn() };

    const service = new FestivalReminderService(
      repository,
      festivals,
      notifications,
      () => new Date('2026-09-20T00:00:00.000Z'),
    );
    await expect(service.create('user-1', 'not-a-festival', {})).rejects.toBeInstanceOf(
      FestivalReminderFestivalNotFoundError,
    );
    await expect(service.create('user-1', 'moriones', {})).rejects.toBeInstanceOf(
      FestivalReminderUnavailableError,
    );

    const tooLate = new FestivalReminderService(
      repository,
      festivals,
      notifications,
      () => new Date('2026-09-30T02:00:00.000Z'),
    );
    await expect(tooLate.create('user-1', 'masskara', {})).rejects.toBeInstanceOf(
      FestivalReminderUnavailableError,
    );
  });

  it('retrieves and cancels only the authenticated user reminder', async () => {
    const repository = new InMemoryFestivalReminderRepository();
    const service = new FestivalReminderService(
      repository,
      new InMemoryFestivalRepository(),
      { sendFestivalReminderNotification: jest.fn() },
      () => new Date('2026-09-20T00:00:00.000Z'),
    );
    await service.create('user-1', 'masskara', {});

    await expect(service.get('user-2', 'masskara')).resolves.toBeNull();
    await service.cancel('user-2', 'masskara');
    await expect(service.get('user-1', 'masskara')).resolves.not.toBeNull();
    await service.cancel('user-1', 'masskara');
    await expect(service.get('user-1', 'masskara')).resolves.toBeNull();
  });

  it('claims once and dispatches through NotificationService when preference is enabled', async () => {
    let current = new Date('2026-09-20T00:00:00.000Z');
    const reminderRepository = new InMemoryFestivalReminderRepository();
    const notificationRepository = new InMemoryNotificationRepository();
    await notificationRepository.upsertToken(
      'user-1',
      'token-id',
      'ExpoPushToken[festival]',
      'android',
    );
    await notificationRepository.updatePreferences('user-1', {
      festivalRemindersEnabled: true,
    });
    const provider: NotificationProvider = {
      send: jest.fn(async (messages) =>
        messages.map((message) => ({
          pushToken: message.to,
          status: 'accepted' as const,
          shouldDeactivateToken: false,
        })),
      ),
    };
    const service = new FestivalReminderService(
      reminderRepository,
      new InMemoryFestivalRepository(),
      new NotificationService(notificationRepository, provider),
      () => current,
    );
    await service.create('user-1', 'masskara', {});
    current = new Date('2026-10-01T00:00:00.000Z');

    await expect(service.dispatchDueReminders()).resolves.toEqual({
      claimed: 1,
      sent: 1,
      skipped: 0,
    });
    await expect(service.dispatchDueReminders()).resolves.toEqual({
      claimed: 0,
      sent: 0,
      skipped: 0,
    });
    expect(provider.send).toHaveBeenCalledWith([
      expect.objectContaining({
        data: { type: 'festival_reminder', festivalId: 'masskara' },
      }),
    ]);
  });

  it('respects disabled Festival notification preferences', async () => {
    let current = new Date('2026-09-20T00:00:00.000Z');
    const reminderRepository = new InMemoryFestivalReminderRepository();
    const notificationRepository = new InMemoryNotificationRepository();
    await notificationRepository.upsertToken(
      'user-1',
      'token-id',
      'ExpoPushToken[festival]',
      'android',
    );
    const provider: NotificationProvider = { send: jest.fn() };
    const service = new FestivalReminderService(
      reminderRepository,
      new InMemoryFestivalRepository(),
      new NotificationService(notificationRepository, provider),
      () => current,
    );
    await service.create('user-1', 'masskara', {});
    current = new Date('2026-10-01T00:00:00.000Z');

    await expect(service.dispatchDueReminders()).resolves.toEqual({
      claimed: 1,
      sent: 0,
      skipped: 1,
    });
    expect(provider.send).not.toHaveBeenCalled();
  });
});
