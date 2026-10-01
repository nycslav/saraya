import type { DevicePlatform, NotificationCategory, UpdateNotificationPreferences } from '@saraya/contracts';

import { getPool } from '../../platform/database/pool';
import type { DeviceToken, NotificationRepository } from './notification.repository';

type TokenRow = {
  id: string; user_id: string; push_token: string; platform: DevicePlatform; is_active: boolean;
};
type PreferenceRow = { safety_alerts_enabled: boolean; festival_reminders_enabled: boolean };

const tokenColumns = 'id, user_id, push_token, platform, is_active';
const mapToken = (row: TokenRow): DeviceToken => ({
  id: row.id, userId: row.user_id, pushToken: row.push_token,
  platform: row.platform, isActive: row.is_active,
});
const mapPreferences = (row?: PreferenceRow) => ({
  safetyAlertsEnabled: row?.safety_alerts_enabled ?? false,
  festivalRemindersEnabled: row?.festival_reminders_enabled ?? false,
});

export class PostgresNotificationRepository implements NotificationRepository {
  async upsertToken(userId: string, id: string, pushToken: string, platform: DevicePlatform) {
    await getPool().query(
      `INSERT INTO device_tokens (id, user_id, push_token, platform)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (push_token) DO UPDATE SET
         user_id = EXCLUDED.user_id, platform = EXCLUDED.platform, is_active = true,
         last_seen_at = now(), updated_at = now()`,
      [id, userId, pushToken, platform],
    );
  }

  async deactivateToken(userId: string, pushToken: string) {
    const result = await getPool().query(
      'UPDATE device_tokens SET is_active = false, updated_at = now() WHERE user_id = $1 AND push_token = $2 AND is_active',
      [userId, pushToken],
    );
    return Boolean(result.rowCount);
  }

  async deactivateTokens(pushTokens: string[]) {
    if (pushTokens.length === 0) return;
    await getPool().query(
      'UPDATE device_tokens SET is_active = false, updated_at = now() WHERE push_token = ANY($1::text[])',
      [pushTokens],
    );
  }

  async findActiveTokens(userId: string) {
    const result = await getPool().query<TokenRow>(
      `SELECT ${tokenColumns} FROM device_tokens WHERE user_id = $1 AND is_active`, [userId],
    );
    return result.rows.map(mapToken);
  }

  async findEligibleTokens(userIds: string[], category: NotificationCategory) {
    if (userIds.length === 0) return [];
    const column = category === 'safety_alert' ? 'safety_alerts_enabled' : 'festival_reminders_enabled';
    const result = await getPool().query<TokenRow>(
      `SELECT ${tokenColumns} FROM device_tokens d
       JOIN notification_preferences p ON p.user_id = d.user_id
       WHERE d.user_id = ANY($1::text[]) AND d.is_active AND p.${column} = true`,
      [userIds],
    );
    return result.rows.map(mapToken);
  }

  async getPreferences(userId: string) {
    const result = await getPool().query<PreferenceRow>(
      'SELECT safety_alerts_enabled, festival_reminders_enabled FROM notification_preferences WHERE user_id = $1',
      [userId],
    );
    return mapPreferences(result.rows[0]);
  }

  async updatePreferences(userId: string, changes: UpdateNotificationPreferences) {
    const current = await this.getPreferences(userId);
    const next = { ...current, ...changes };
    const result = await getPool().query<PreferenceRow>(
      `INSERT INTO notification_preferences (user_id, safety_alerts_enabled, festival_reminders_enabled)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET safety_alerts_enabled = EXCLUDED.safety_alerts_enabled,
         festival_reminders_enabled = EXCLUDED.festival_reminders_enabled, updated_at = now()
       RETURNING safety_alerts_enabled, festival_reminders_enabled`,
      [userId, next.safetyAlertsEnabled, next.festivalRemindersEnabled],
    );
    return mapPreferences(result.rows[0]);
  }
}
