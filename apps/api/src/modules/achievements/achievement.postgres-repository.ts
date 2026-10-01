import {
  achievementSchema,
  userAchievementSchema,
  type Achievement,
  type UserAchievement,
} from '@saraya/contracts';
import type { QueryResultRow } from 'pg';

import { getPool } from '../../platform/database/pool';
import type { AchievementRepository } from './achievement.repository';

interface AchievementRow extends QueryResultRow {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: Achievement['category'];
  rule_type: Achievement['ruleType'];
  threshold: number;
  destination_category: string | null;
  island_group: string | null;
}

interface UserAchievementRow extends QueryResultRow {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: Date | string;
  check_in_id: string | null;
}

export class PostgresAchievementRepository implements AchievementRepository {
  async findAll() {
    const result = await getPool().query<AchievementRow>(
      `SELECT id, title, description, icon, category, rule_type, threshold,
              destination_category, island_group
       FROM achievements ORDER BY threshold, title`,
    );
    return result.rows.map(mapAchievement);
  }

  async findForUser(userId: string) {
    const result = await getPool().query<UserAchievementRow>(
      `SELECT id, user_id, achievement_id, unlocked_at, check_in_id
       FROM user_achievements WHERE user_id = $1 ORDER BY unlocked_at DESC`,
      [userId],
    );
    return result.rows.map(mapUserAchievement);
  }

  async unlock(userId: string, achievementId: string, checkInId: string, id: string) {
    const result = await getPool().query<UserAchievementRow>(
      `INSERT INTO user_achievements (id, user_id, achievement_id, check_in_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, achievement_id) DO UPDATE
         SET achievement_id = EXCLUDED.achievement_id
       RETURNING id, user_id, achievement_id, unlocked_at, check_in_id`,
      [id, userId, achievementId, checkInId],
    );
    return mapUserAchievement(result.rows[0]);
  }
}

function mapAchievement(row: AchievementRow) {
  return achievementSchema.parse({
    id: row.id,
    title: row.title,
    description: row.description,
    icon: row.icon,
    category: row.category,
    ruleType: row.rule_type,
    threshold: row.threshold,
    destinationCategory: row.destination_category,
    islandGroup: row.island_group,
  });
}

function mapUserAchievement(row: UserAchievementRow | undefined) {
  if (!row) throw new Error('PostgreSQL did not return the unlocked achievement.');
  return userAchievementSchema.parse({
    id: row.id,
    userId: row.user_id,
    achievementId: row.achievement_id,
    unlockedAt: new Date(row.unlocked_at).toISOString(),
    checkInId: row.check_in_id,
  });
}
