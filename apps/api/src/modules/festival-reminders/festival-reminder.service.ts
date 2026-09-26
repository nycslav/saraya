import { randomUUID } from 'node:crypto';

import {
  createFestivalReminderSchema,
  festivalIdParamsSchema,
  festivalReminderSchema,
} from '@saraya/contracts';

import type { DeliveryResult } from '../../integrations/notifications';
import {
  createFestivalRepository,
  type FestivalRepository,
} from '../festivals/festival.repository';
import { NotificationService } from '../notifications/notification.service';
import {
  createFestivalReminderRepository,
  type FestivalReminderRepository,
  type OwnedFestivalReminder,
} from './festival-reminder.repository';

export class FestivalReminderFestivalNotFoundError extends Error {
  constructor() {
    super('Festival not found.');
    this.name = 'FestivalReminderFestivalNotFoundError';
  }
}

export class FestivalReminderUnavailableError extends Error {
  constructor() {
    super('This festival does not have a future confirmed date for an exact reminder.');
    this.name = 'FestivalReminderUnavailableError';
  }
}

type FestivalNotificationSender = Pick<NotificationService, 'sendFestivalReminderNotification'>;

const publicReminder = ({ userId: _userId, ...reminder }: OwnedFestivalReminder) =>
  festivalReminderSchema.parse(reminder);

export class FestivalReminderService {
  constructor(
    private readonly repository: FestivalReminderRepository = createFestivalReminderRepository(),
    private readonly festivalRepository: FestivalRepository = createFestivalRepository(),
    private readonly notifications: FestivalNotificationSender = new NotificationService(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  async create(userId: string, rawFestivalId: unknown, rawInput: unknown) {
    const { id: festivalId } = festivalIdParamsSchema.parse({ id: rawFestivalId });
    const { leadDays } = createFestivalReminderSchema.parse(rawInput);
    const festival = await this.festivalRepository.findById(festivalId);
    if (!festival) throw new FestivalReminderFestivalNotFoundError();
    if (
      festival.occurrence.scheduleStatus !== 'confirmed' ||
      !festival.occurrence.confirmedStartDate ||
      !festival.occurrence.confirmedEndDate
    ) {
      throw new FestivalReminderUnavailableError();
    }

    const remindAt = reminderTime(festival.occurrence.confirmedStartDate, leadDays);
    const current = this.now();
    if (new Date(remindAt) <= current) throw new FestivalReminderUnavailableError();

    return publicReminder(
      await this.repository.createOrUpdate({
        id: randomUUID(),
        userId,
        festivalId,
        leadDays,
        remindAt,
        now: current.toISOString(),
      }),
    );
  }

  async get(userId: string, rawFestivalId: unknown) {
    const { id } = festivalIdParamsSchema.parse({ id: rawFestivalId });
    if (!(await this.festivalRepository.findById(id))) {
      throw new FestivalReminderFestivalNotFoundError();
    }
    const reminder = await this.repository.findActive(userId, id);
    return reminder ? publicReminder(reminder) : null;
  }

  async list(userId: string) {
    return (await this.repository.listActive(userId)).map(publicReminder);
  }

  async cancel(userId: string, rawFestivalId: unknown) {
    const { id } = festivalIdParamsSchema.parse({ id: rawFestivalId });
    if (!(await this.festivalRepository.findById(id))) {
      throw new FestivalReminderFestivalNotFoundError();
    }
    await this.repository.cancel(userId, id, this.now().toISOString());
  }

  async dispatchDueReminders(limit = 100) {
    const dispatchTime = this.now();
    const reminders = await this.repository.claimDue(dispatchTime.toISOString(), limit);
    let sent = 0;
    let skipped = 0;

    for (const reminder of reminders) {
      const festival = await this.festivalRepository.findById(reminder.festivalId);
      let results: DeliveryResult[] = [];
      if (festival) {
        results = await this.notifications.sendFestivalReminderNotification([reminder.userId], {
          id: festival.id,
          name: festival.name,
          reminderText: `${festival.name} starts on ${festival.occurrence.confirmedStartDate}. Verify the official schedule before travel.`,
        });
      }
      const status = results.some((result) => result.status === 'accepted') ? 'sent' : 'skipped';
      await this.repository.completeDispatch(reminder.id, status, dispatchTime.toISOString());
      if (status === 'sent') sent += 1;
      else skipped += 1;
    }

    return { claimed: reminders.length, sent, skipped };
  }
}

export function reminderTime(confirmedStartDate: string, leadDays: number) {
  const start = new Date(`${confirmedStartDate}T09:00:00+08:00`);
  return new Date(start.getTime() - leadDays * 24 * 60 * 60 * 1000).toISOString();
}
