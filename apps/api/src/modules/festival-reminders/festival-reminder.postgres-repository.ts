import {
  festivalReminderSchema,
  type FestivalReminderLeadDays,
  type FestivalReminderStatus,
} from '@saraya/contracts';
import type { QueryResultRow } from 'pg';

import { getPool } from '../../platform/database/pool';
import type {
  FestivalReminderRepository,
  OwnedFestivalReminder,
} from './festival-reminder.repository';

interface FestivalReminderRow extends QueryResultRow {
  id: string;
  user_id: string;
  festival_id: string;
  lead_days: number;
  remind_at: Date | string;
  status: FestivalReminderStatus;
  sent_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

const columns = `id, user_id, festival_id, lead_days, remind_at, status,
  sent_at, created_at, updated_at`;
const claimedColumns = `reminder.id, reminder.user_id, reminder.festival_id,
  reminder.lead_days, reminder.remind_at, reminder.status, reminder.sent_at,
  reminder.created_at, reminder.updated_at`;
const iso = (value: Date | string) =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

function mapReminder(row: FestivalReminderRow): OwnedFestivalReminder {
  return {
    ...festivalReminderSchema.parse({
      id: row.id,
      festivalId: row.festival_id,
      leadDays: row.lead_days,
      remindAt: iso(row.remind_at),
      status: row.status,
      sentAt: row.sent_at ? iso(row.sent_at) : null,
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
    }),
    userId: row.user_id,
  };
}

export class PostgresFestivalReminderRepository implements FestivalReminderRepository {
  async createOrUpdate(input: {
    id: string;
    userId: string;
    festivalId: string;
    leadDays: FestivalReminderLeadDays;
    remindAt: string;
    now: string;
  }) {
    const result = await getPool().query<FestivalReminderRow>(
      `INSERT INTO festival_reminders (
         id, user_id, festival_id, lead_days, remind_at, status, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, 'active', $6, $6)
       ON CONFLICT (user_id, festival_id) WHERE status = 'active'
       DO UPDATE SET lead_days = EXCLUDED.lead_days, remind_at = EXCLUDED.remind_at,
         updated_at = EXCLUDED.updated_at
       RETURNING ${columns}`,
      [input.id, input.userId, input.festivalId, input.leadDays, input.remindAt, input.now],
    );
    return mapReminder(result.rows[0]!);
  }

  async findActive(userId: string, festivalId: string) {
    const result = await getPool().query<FestivalReminderRow>(
      `SELECT ${columns} FROM festival_reminders
       WHERE user_id = $1 AND festival_id = $2 AND status = 'active'`,
      [userId, festivalId],
    );
    return result.rows[0] ? mapReminder(result.rows[0]) : null;
  }

  async listActive(userId: string) {
    const result = await getPool().query<FestivalReminderRow>(
      `SELECT ${columns} FROM festival_reminders
       WHERE user_id = $1 AND status = 'active'
       ORDER BY remind_at ASC, id ASC`,
      [userId],
    );
    return result.rows.map(mapReminder);
  }

  async cancel(userId: string, festivalId: string, now: string) {
    const result = await getPool().query(
      `UPDATE festival_reminders SET status = 'cancelled', updated_at = $3
       WHERE user_id = $1 AND festival_id = $2 AND status = 'active'`,
      [userId, festivalId, now],
    );
    return Boolean(result.rowCount);
  }

  async claimDue(now: string, limit: number) {
    const result = await getPool().query<FestivalReminderRow>(
      `WITH due AS (
         SELECT id FROM festival_reminders
         WHERE status = 'active' AND remind_at <= $1
         ORDER BY remind_at ASC, id ASC
         FOR UPDATE SKIP LOCKED
         LIMIT $2
       )
       UPDATE festival_reminders AS reminder
       SET status = 'dispatching', updated_at = $1
       FROM due
       WHERE reminder.id = due.id
       RETURNING ${claimedColumns}`,
      [now, limit],
    );
    return result.rows.map(mapReminder);
  }

  async completeDispatch(
    id: string,
    status: Extract<FestivalReminderStatus, 'sent' | 'skipped'>,
    now: string,
  ) {
    await getPool().query(
      `UPDATE festival_reminders
       SET status = $2, sent_at = CASE WHEN $2 = 'sent' THEN $3::timestamptz ELSE NULL END,
         updated_at = $3
       WHERE id = $1 AND status = 'dispatching'`,
      [id, status, now],
    );
  }
}
