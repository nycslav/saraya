import {
  checkInSchema,
  type CheckIn,
  type CreateCheckIn,
  type UpdateCheckIn,
} from '@saraya/contracts';
import type { QueryResultRow } from 'pg';

import { getPool } from '../../platform/database/pool';
import type { CheckInRepository } from './check-in.repository';

interface CheckInRow extends QueryResultRow {
  id: string;
  user_id: string;
  destination_id: string;
  visited_at: Date | string;
  journal_entry: string;
  mood: CheckIn['mood'];
  companions: string[];
  tags: string[];
  photo_url: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

const columns = `id, user_id, destination_id, visited_at, journal_entry, mood,
  companions, tags, photo_url, created_at, updated_at`;

export class PostgresCheckInRepository implements CheckInRepository {
  async findAll(userId: string) {
    const result = await getPool().query<CheckInRow>(
      `SELECT ${columns} FROM check_ins WHERE user_id = $1 ORDER BY visited_at DESC`,
      [userId],
    );
    return result.rows.map(mapCheckIn);
  }

  async findById(userId: string, id: string) {
    const result = await getPool().query<CheckInRow>(
      `SELECT ${columns} FROM check_ins WHERE user_id = $1 AND id = $2`, [userId, id],
    );
    return result.rows[0] ? mapCheckIn(result.rows[0]) : null;
  }

  async findRecent(userId: string, destinationId: string, since: string) {
    const result = await getPool().query<CheckInRow>(
      `SELECT ${columns} FROM check_ins
       WHERE user_id = $1 AND destination_id = $2 AND created_at >= $3
       ORDER BY created_at DESC LIMIT 1`,
      [userId, destinationId, since],
    );
    return result.rows[0] ? mapCheckIn(result.rows[0]) : null;
  }

  async create(userId: string, id: string, input: CreateCheckIn) {
    const result = await getPool().query<CheckInRow>(
      `INSERT INTO check_ins (
        id, user_id, destination_id, visited_at, journal_entry, mood, companions, tags, photo_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING ${columns}`,
      [id, userId, input.destinationId, input.visitedAt, input.journalEntry, input.mood,
        input.companions, input.tags, input.photoUrl],
    );
    return mapCheckIn(result.rows[0]);
  }

  async update(userId: string, id: string, input: UpdateCheckIn) {
    const result = await getPool().query<CheckInRow>(
      `UPDATE check_ins SET
        visited_at = CASE WHEN $3::boolean THEN $4 ELSE visited_at END,
        journal_entry = CASE WHEN $5::boolean THEN $6 ELSE journal_entry END,
        mood = CASE WHEN $7::boolean THEN $8 ELSE mood END,
        companions = CASE WHEN $9::boolean THEN $10 ELSE companions END,
        tags = CASE WHEN $11::boolean THEN $12 ELSE tags END,
        photo_url = CASE WHEN $13::boolean THEN $14 ELSE photo_url END,
        updated_at = now()
       WHERE user_id = $1 AND id = $2 RETURNING ${columns}`,
      [userId, id,
        input.visitedAt !== undefined, input.visitedAt ?? null,
        input.journalEntry !== undefined, input.journalEntry ?? null,
        input.mood !== undefined, input.mood ?? null,
        input.companions !== undefined, input.companions ?? null,
        input.tags !== undefined, input.tags ?? null,
        input.photoUrl !== undefined, input.photoUrl ?? null],
    );
    return result.rows[0] ? mapCheckIn(result.rows[0]) : null;
  }

  async delete(userId: string, id: string) {
    const result = await getPool().query('DELETE FROM check_ins WHERE user_id = $1 AND id = $2', [userId, id]);
    return result.rowCount === 1;
  }
}

function mapCheckIn(row: CheckInRow | undefined) {
  if (!row) throw new Error('PostgreSQL did not return the check-in.');
  return checkInSchema.parse({
    id: row.id,
    userId: row.user_id,
    destinationId: row.destination_id,
    visitedAt: new Date(row.visited_at).toISOString(),
    journalEntry: row.journal_entry,
    mood: row.mood,
    companions: row.companions,
    tags: row.tags,
    photoUrl: row.photo_url,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  });
}
