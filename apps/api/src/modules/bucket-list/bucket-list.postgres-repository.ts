import {
  bucketListItemSchema,
  type BucketListItem,
  type CreateBucketListItem,
  type UpdateBucketListItem,
} from '@saraya/contracts';
import type { QueryResultRow } from 'pg';

import { getPool } from '../../platform/database/pool';
import { BucketListDuplicateError } from './bucket-list.errors';
import type { BucketListRepository } from './bucket-list.repository';

interface BucketListItemRow extends QueryResultRow {
  id: string;
  user_id: string;
  destination_id: string;
  priority: BucketListItem['priority'];
  personal_notes: string;
  status: BucketListItem['status'];
  added_at: Date | string;
  updated_at: Date | string;
}

const columns = `
  id, user_id, destination_id, priority, personal_notes, status, added_at, updated_at
`;

export class PostgresBucketListRepository implements BucketListRepository {
  async findAll(userId: string): Promise<BucketListItem[]> {
    const result = await getPool().query<BucketListItemRow>(
      `SELECT ${columns}
       FROM bucket_list_items
       WHERE user_id = $1
       ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                added_at DESC`,
      [userId],
    );
    return result.rows.map(mapItem);
  }

  async findById(userId: string, id: string): Promise<BucketListItem | null> {
    const result = await getPool().query<BucketListItemRow>(
      `SELECT ${columns} FROM bucket_list_items WHERE user_id = $1 AND id = $2`,
      [userId, id],
    );
    return result.rows[0] ? mapItem(result.rows[0]) : null;
  }

  async findByDestination(
    userId: string,
    destinationId: string,
  ): Promise<BucketListItem | null> {
    const result = await getPool().query<BucketListItemRow>(
      `SELECT ${columns}
       FROM bucket_list_items
       WHERE user_id = $1 AND destination_id = $2`,
      [userId, destinationId],
    );
    return result.rows[0] ? mapItem(result.rows[0]) : null;
  }

  async create(
    userId: string,
    id: string,
    item: CreateBucketListItem,
  ): Promise<BucketListItem> {
    try {
      const result = await getPool().query<BucketListItemRow>(
        `INSERT INTO bucket_list_items (
          id, user_id, destination_id, priority, personal_notes, status
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING ${columns}`,
        [id, userId, item.destinationId, item.priority, item.personalNotes, item.status],
      );
      return mapItem(result.rows[0]);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BucketListDuplicateError('Destination is already in the bucket list.');
      }
      throw error;
    }
  }

  async update(
    userId: string,
    id: string,
    changes: UpdateBucketListItem,
  ): Promise<BucketListItem | null> {
    const result = await getPool().query<BucketListItemRow>(
      `UPDATE bucket_list_items
       SET priority = CASE WHEN $3::boolean THEN $4 ELSE priority END,
           personal_notes = CASE WHEN $5::boolean THEN $6 ELSE personal_notes END,
           status = CASE WHEN $7::boolean THEN $8 ELSE status END,
           updated_at = now()
       WHERE user_id = $1 AND id = $2
       RETURNING ${columns}`,
      [
        userId,
        id,
        changes.priority !== undefined,
        changes.priority ?? null,
        changes.personalNotes !== undefined,
        changes.personalNotes ?? null,
        changes.status !== undefined,
        changes.status ?? null,
      ],
    );
    return result.rows[0] ? mapItem(result.rows[0]) : null;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const result = await getPool().query(
      'DELETE FROM bucket_list_items WHERE user_id = $1 AND id = $2',
      [userId, id],
    );
    return result.rowCount === 1;
  }
}

function mapItem(row: BucketListItemRow | undefined): BucketListItem {
  if (!row) {
    throw new Error('PostgreSQL did not return the bucket-list item.');
  }

  return bucketListItemSchema.parse({
    id: row.id,
    userId: row.user_id,
    destinationId: row.destination_id,
    priority: row.priority,
    personalNotes: row.personal_notes,
    status: row.status,
    addedAt: new Date(row.added_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  });
}

function isUniqueViolation(error: unknown): error is { code: string; constraint?: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505' &&
    (!('constraint' in error) ||
      error.constraint === 'bucket_list_items_user_destination_unique')
  );
}
