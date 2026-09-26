import type {
  CreateFestivalReminder,
  FestivalReminder,
} from '@saraya/contracts';
import { createApiClient } from '@saraya/api-client';

import { getApiBaseUrl } from '@/core/config';
import { sessionStore } from '@/features/auth/sessionStore';

export interface FestivalReminderGateway {
  create(festivalId: string, input?: CreateFestivalReminder): Promise<FestivalReminder>;
  get(festivalId: string): Promise<FestivalReminder | null>;
  cancel(festivalId: string): Promise<void>;
  list(): Promise<FestivalReminder[]>;
}

function client() {
  return createApiClient(
    getApiBaseUrl(),
    async () => (await sessionStore.read())?.accessToken ?? null,
  );
}

export class ApiFestivalReminderGateway implements FestivalReminderGateway {
  create(festivalId: string, input: CreateFestivalReminder = { leadDays: 1 }) {
    return client().festivals.createReminder(festivalId, input);
  }

  get(festivalId: string) {
    return client().festivals.getReminder(festivalId);
  }

  cancel(festivalId: string) {
    return client().festivals.cancelReminder(festivalId);
  }

  list() {
    return client().festivals.listReminders();
  }
}

export class FixtureFestivalReminderGateway implements FestivalReminderGateway {
  private readonly reminders = new Map<string, FestivalReminder>();

  async create(festivalId: string, input: CreateFestivalReminder = { leadDays: 1 }) {
    const now = '2026-09-25T00:00:00.000Z';
    const reminder: FestivalReminder = {
      id: '00000000-0000-4000-8000-000000000001',
      festivalId,
      leadDays: input.leadDays,
      remindAt: '2026-09-30T01:00:00.000Z',
      status: 'active',
      sentAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.reminders.set(festivalId, reminder);
    return reminder;
  }

  async get(festivalId: string) {
    return this.reminders.get(festivalId) ?? null;
  }

  async cancel(festivalId: string) {
    this.reminders.delete(festivalId);
  }

  async list() {
    return [...this.reminders.values()];
  }
}

export const festivalReminderGateway: FestivalReminderGateway =
  process.env.EXPO_PUBLIC_DATA_MODE === 'api'
    ? new ApiFestivalReminderGateway()
    : new FixtureFestivalReminderGateway();
