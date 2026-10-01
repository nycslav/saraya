import type {
  FestivalReminder,
  FestivalReminderLeadDays,
  FestivalReminderStatus,
} from '@saraya/contracts';

import { hasDatabaseConfiguration } from '../../platform/database/pool';
import { PostgresFestivalReminderRepository } from './festival-reminder.postgres-repository';

export type OwnedFestivalReminder = FestivalReminder & { userId: string };

export interface FestivalReminderRepository {
  createOrUpdate(input: {
    id: string;
    userId: string;
    festivalId: string;
    leadDays: FestivalReminderLeadDays;
    remindAt: string;
    now: string;
  }): Promise<OwnedFestivalReminder>;
  findActive(userId: string, festivalId: string): Promise<OwnedFestivalReminder | null>;
  listActive(userId: string): Promise<OwnedFestivalReminder[]>;
  cancel(userId: string, festivalId: string, now: string): Promise<boolean>;
  claimDue(now: string, limit: number): Promise<OwnedFestivalReminder[]>;
  completeDispatch(id: string, status: Extract<FestivalReminderStatus, 'sent' | 'skipped'>, now: string): Promise<void>;
}

export class InMemoryFestivalReminderRepository implements FestivalReminderRepository {
  private readonly reminders = new Map<string, OwnedFestivalReminder>();

  async createOrUpdate(input: {
    id: string;
    userId: string;
    festivalId: string;
    leadDays: FestivalReminderLeadDays;
    remindAt: string;
    now: string;
  }) {
    const existing = [...this.reminders.values()].find(
      (reminder) =>
        reminder.userId === input.userId &&
        reminder.festivalId === input.festivalId &&
        reminder.status === 'active',
    );
    const reminder: OwnedFestivalReminder = existing
      ? {
          ...existing,
          leadDays: input.leadDays,
          remindAt: input.remindAt,
          updatedAt: input.now,
        }
      : {
          id: input.id,
          userId: input.userId,
          festivalId: input.festivalId,
          leadDays: input.leadDays,
          remindAt: input.remindAt,
          status: 'active',
          sentAt: null,
          createdAt: input.now,
          updatedAt: input.now,
        };
    this.reminders.set(reminder.id, reminder);
    return { ...reminder };
  }

  async findActive(userId: string, festivalId: string) {
    const reminder = [...this.reminders.values()].find(
      (candidate) =>
        candidate.userId === userId &&
        candidate.festivalId === festivalId &&
        candidate.status === 'active',
    );
    return reminder ? { ...reminder } : null;
  }

  async listActive(userId: string) {
    return [...this.reminders.values()]
      .filter((reminder) => reminder.userId === userId && reminder.status === 'active')
      .sort((left, right) => left.remindAt.localeCompare(right.remindAt))
      .map((reminder) => ({ ...reminder }));
  }

  async cancel(userId: string, festivalId: string, now: string) {
    const reminder = await this.findActive(userId, festivalId);
    if (!reminder) return false;
    this.reminders.set(reminder.id, { ...reminder, status: 'cancelled', updatedAt: now });
    return true;
  }

  async claimDue(now: string, limit: number) {
    const due = [...this.reminders.values()]
      .filter((reminder) => reminder.status === 'active' && reminder.remindAt <= now)
      .sort((left, right) => left.remindAt.localeCompare(right.remindAt))
      .slice(0, limit)
      .map((reminder) => ({ ...reminder, status: 'dispatching' as const, updatedAt: now }));
    due.forEach((reminder) => this.reminders.set(reminder.id, reminder));
    return due;
  }

  async completeDispatch(
    id: string,
    status: Extract<FestivalReminderStatus, 'sent' | 'skipped'>,
    now: string,
  ) {
    const reminder = this.reminders.get(id);
    if (!reminder || reminder.status !== 'dispatching') return;
    this.reminders.set(id, {
      ...reminder,
      status,
      sentAt: status === 'sent' ? now : null,
      updatedAt: now,
    });
  }
}

export function createFestivalReminderRepository(): FestivalReminderRepository {
  return process.env.NODE_ENV !== 'test' && hasDatabaseConfiguration()
    ? new PostgresFestivalReminderRepository()
    : new InMemoryFestivalReminderRepository();
}
