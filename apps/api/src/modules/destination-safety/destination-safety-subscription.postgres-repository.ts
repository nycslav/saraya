import type { SafetyAlert } from '@saraya/contracts';
import type { QueryResultRow } from 'pg';

import { getPool } from '../../platform/database/pool';
import type {
  DestinationSafetySubscriptionRepository,
  OwnedDestinationSafetySubscription,
} from './destination-safety-subscription.repository';

interface SubscriptionRow extends QueryResultRow {
  user_id: string;
  destination_id: string;
  created_at: Date | string;
}

interface SubscriberRow extends QueryResultRow { user_id: string }

const mapSubscription = (row: SubscriptionRow): OwnedDestinationSafetySubscription => ({
  userId: row.user_id,
  destinationId: row.destination_id,
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString(),
});

export class PostgresDestinationSafetySubscriptionRepository
implements DestinationSafetySubscriptionRepository {
  async subscribe(userId: string, destinationId: string, now: string) {
    const result = await getPool().query<SubscriptionRow>(
      `INSERT INTO destination_safety_subscriptions (user_id, destination_id, created_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, destination_id) DO UPDATE
         SET destination_id = EXCLUDED.destination_id
       RETURNING user_id, destination_id, created_at`,
      [userId, destinationId, now],
    );
    return mapSubscription(result.rows[0]!);
  }

  async find(userId: string, destinationId: string) {
    const result = await getPool().query<SubscriptionRow>(
      `SELECT user_id, destination_id, created_at
       FROM destination_safety_subscriptions
       WHERE user_id = $1 AND destination_id = $2`,
      [userId, destinationId],
    );
    return result.rows[0] ? mapSubscription(result.rows[0]) : null;
  }

  async unsubscribe(userId: string, destinationId: string) {
    const result = await getPool().query(
      `DELETE FROM destination_safety_subscriptions
       WHERE user_id = $1 AND destination_id = $2`,
      [userId, destinationId],
    );
    return Boolean(result.rowCount);
  }

  async findSubscriberUserIdsForAlert(alert: SafetyAlert) {
    const affectedArea = alert.affectedArea ? JSON.stringify(alert.affectedArea) : null;
    const result = await getPool().query<SubscriberRow>(
      `SELECT DISTINCT subscription.user_id
       FROM destination_safety_subscriptions AS subscription
       JOIN destinations AS destination ON destination.id = subscription.destination_id
       WHERE (
         $1::jsonb IS NOT NULL
         AND ST_Covers(ST_GeomFromGeoJSON($1::text)::geography, destination.location)
       ) OR (
         $1::jsonb IS NULL
         AND destination.region = ANY($2::text[])
       )
       ORDER BY subscription.user_id`,
      [affectedArea, alert.affectedRegions],
    );
    return result.rows.map(({ user_id }) => user_id);
  }
}
