import type { PoolClient, QueryResultRow } from 'pg';

import { getPool } from '../../platform/database/pool';

type ExportBundle = {
  data: Record<string, unknown>;
  photoUrls: string[];
};

export class AccountManagementRepository {
  async exportData(userId: string): Promise<ExportBundle> {
    const pool = getPool();
    const [
      profile, checkIns, bucketList, achievements, itineraries, itineraryDays, itineraryStops,
      reminders, preferences, destinationAlerts, regionAlerts, entitlements, quota, topUps, devices,
    ] = await Promise.all([
      pool.query(`SELECT id, email, display_name, avatar_url, home_region, travel_style, budget,
        interests, preferred_regions, onboarding_complete, created_at, updated_at
        FROM users WHERE id = $1`, [userId]),
      pool.query('SELECT * FROM check_ins WHERE user_id = $1 ORDER BY visited_at DESC', [userId]),
      pool.query('SELECT * FROM bucket_list_items WHERE user_id = $1 ORDER BY added_at DESC', [userId]),
      pool.query(`SELECT ua.achievement_id, a.title, a.description, ua.unlocked_at, ua.check_in_id
        FROM user_achievements ua JOIN achievements a ON a.id = ua.achievement_id
        WHERE ua.user_id = $1 ORDER BY ua.unlocked_at DESC`, [userId]),
      pool.query('SELECT * FROM itineraries WHERE user_id = $1 ORDER BY created_at DESC', [userId]),
      pool.query(`SELECT d.* FROM itinerary_days d JOIN itineraries i ON i.id = d.itinerary_id
        WHERE i.user_id = $1 ORDER BY d.itinerary_id, d.day_number`, [userId]),
      pool.query(`SELECT s.* FROM itinerary_stops s JOIN itineraries i ON i.id = s.itinerary_id
        WHERE i.user_id = $1 ORDER BY s.itinerary_id, s.day_number, s.time`, [userId]),
      pool.query('SELECT * FROM festival_reminders WHERE user_id = $1 ORDER BY created_at DESC', [userId]),
      pool.query(`SELECT safety_alerts_enabled, festival_reminders_enabled, created_at, updated_at
        FROM notification_preferences WHERE user_id = $1`, [userId]),
      pool.query(`SELECT destination_id, created_at FROM destination_safety_subscriptions
        WHERE user_id = $1 ORDER BY created_at DESC`, [userId]),
      pool.query(`SELECT region, created_at FROM region_safety_subscriptions
        WHERE user_id = $1 ORDER BY created_at DESC`, [userId]),
      pool.query(`SELECT entitlement_id, is_active, product_id, expires_at, last_event_at, updated_at
        FROM subscription_entitlements WHERE user_id = $1`, [userId]),
      pool.query(`SELECT free_used, premium_period_start, premium_used, top_up_balance, created_at, updated_at
        FROM generation_quota_accounts WHERE user_id = $1`, [userId]),
      pool.query(`SELECT product_id, credits_granted, credits_remaining, purchased_at,
          refunded_at, credits_reversed, created_at
        FROM generation_top_up_transactions WHERE user_id = $1 ORDER BY created_at DESC`, [userId]),
      pool.query(`SELECT platform, is_active, created_at, updated_at, last_seen_at
        FROM device_tokens WHERE user_id = $1 ORDER BY created_at DESC`, [userId]),
    ]);

    const profileRow = profile.rows[0] ?? null;
    const photoUrls = [
      profileRow?.avatar_url,
      ...checkIns.rows.map((row) => row.photo_url),
    ].filter((value): value is string => typeof value === 'string' && value.startsWith('/uploads/check-ins/'));

    return {
      data: {
        exportedAt: new Date().toISOString(),
        profile: profileRow,
        journey: { checkIns: checkIns.rows, achievements: achievements.rows },
        bucketList: bucketList.rows,
        itineraries: { itineraries: itineraries.rows, days: itineraryDays.rows, stops: itineraryStops.rows },
        festivalReminders: reminders.rows,
        notifications: { preferences: preferences.rows[0] ?? null, registeredDevices: devices.rows },
        followedSafetyAreas: { destinations: destinationAlerts.rows, regions: regionAlerts.rows },
        premium: { entitlements: entitlements.rows, quota: quota.rows[0] ?? null, topUps: topUps.rows },
      },
      photoUrls: [...new Set(photoUrls)],
    };
  }

  async deleteAccount(
    userId: string,
    deletePhotos: (photoUrls: string[]) => Promise<void> = async () => undefined,
  ) {
    const client = await getPool().connect();
    let photoUrls: string[] = [];
    try {
      await client.query('BEGIN');
      const photos = await client.query<{ photo_url: string }>(
        `SELECT avatar_url AS photo_url FROM users WHERE id = $1 AND avatar_url IS NOT NULL
         UNION SELECT photo_url FROM check_ins WHERE user_id = $1 AND photo_url IS NOT NULL`,
        [userId],
      );
      for (const table of [
        'generation_quota_reservations', 'generation_top_up_transactions',
        'generation_quota_accounts', 'subscription_entitlements', 'revenuecat_customers',
        'region_safety_subscriptions', 'destination_safety_subscriptions', 'festival_reminders',
        'device_tokens', 'notification_preferences', 'user_achievements', 'check_ins',
        'bucket_list_items', 'itineraries', 'refresh_tokens',
      ]) {
        await this.deleteFrom(client, table, userId);
      }
      await client.query(
        `UPDATE revenuecat_webhook_events SET user_id = NULL, app_user_id = NULL,
          aliases = '{}', transferred_from = '{}', transferred_to = '{}'
         WHERE user_id = $1`,
        [userId],
      );
      const deleted = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
      if (!deleted.rowCount) throw new Error('Account not found.');
      photoUrls = photos.rows.map(({ photo_url }) => photo_url);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    try {
      await deletePhotos(photoUrls);
    } catch (error) {
      console.error('Account deleted, but external photo cleanup failed.', error);
    }
    return photoUrls;
  }

  private async deleteFrom(client: PoolClient, table: string, userId: string) {
    await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
  }
}
