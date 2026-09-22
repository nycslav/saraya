import { seedAchievements } from '../../modules/achievements/achievement.seed';
import { seedDestinations } from '../../modules/destinations/destination.seed';
import { seedSafetyAlerts } from '../../modules/safety-alerts/safety-alert.seed';
import { closePool, getPool } from './pool';

async function seed() {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    for (const destination of seedDestinations) {
      await client.query(
        `INSERT INTO destinations (
          id, name, province, region, island_group, category, rating, summary, description,
          hero_tone, tags, highlights, best_for, location, historical_context, etiquette,
          local_phrase
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13,
          ST_SetSRID(ST_MakePoint($14, $15), 4326)::geography,
          $16, $17, $18
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          province = EXCLUDED.province,
          region = EXCLUDED.region,
          island_group = EXCLUDED.island_group,
          category = EXCLUDED.category,
          rating = EXCLUDED.rating,
          summary = EXCLUDED.summary,
          description = EXCLUDED.description,
          hero_tone = EXCLUDED.hero_tone,
          tags = EXCLUDED.tags,
          highlights = EXCLUDED.highlights,
          best_for = EXCLUDED.best_for,
          location = EXCLUDED.location,
          historical_context = EXCLUDED.historical_context,
          etiquette = EXCLUDED.etiquette,
          local_phrase = EXCLUDED.local_phrase,
          updated_at = now()`,
        [
          destination.id,
          destination.name,
          destination.province,
          destination.region,
          destination.islandGroup,
          destination.category,
          destination.rating,
          destination.summary,
          destination.description,
          destination.heroTone,
          destination.tags,
          destination.highlights,
          destination.bestFor,
          destination.coordinates.longitude,
          destination.coordinates.latitude,
          destination.culturalGuide.historicalContext,
          destination.culturalGuide.etiquette,
          destination.culturalGuide.localPhrase,
        ],
      );
    }
    for (const achievement of seedAchievements) {
      await client.query(
        `INSERT INTO achievements (
          id, title, description, icon, category, rule_type, threshold,
          destination_category, island_group
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          icon = EXCLUDED.icon,
          category = EXCLUDED.category,
          rule_type = EXCLUDED.rule_type,
          threshold = EXCLUDED.threshold,
          destination_category = EXCLUDED.destination_category,
          island_group = EXCLUDED.island_group,
          updated_at = now()`,
        [achievement.id, achievement.title, achievement.description, achievement.icon,
          achievement.category, achievement.ruleType, achievement.threshold,
          achievement.destinationCategory, achievement.islandGroup],
      );
    }
    for (const alert of seedSafetyAlerts) {
      await client.query(
        `INSERT INTO safety_alerts (
          id, alert_type, severity, title, summary, details, advice, alternatives,
          affected_regions, affected_area_description, affected_area, starts_at, ends_at,
          source_provider, source_name, source_url, is_demo, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          CASE WHEN $11::jsonb IS NULL THEN NULL ELSE ST_Multi(ST_GeomFromGeoJSON($11::jsonb))::geography END,
          $12, $13, $14, $15, $16, $17, $18, $19
        )
        ON CONFLICT (id) DO UPDATE SET
          alert_type = EXCLUDED.alert_type,
          severity = EXCLUDED.severity,
          title = EXCLUDED.title,
          summary = EXCLUDED.summary,
          details = EXCLUDED.details,
          advice = EXCLUDED.advice,
          alternatives = EXCLUDED.alternatives,
          affected_regions = EXCLUDED.affected_regions,
          affected_area_description = EXCLUDED.affected_area_description,
          affected_area = EXCLUDED.affected_area,
          starts_at = EXCLUDED.starts_at,
          ends_at = EXCLUDED.ends_at,
          source_provider = EXCLUDED.source_provider,
          source_name = EXCLUDED.source_name,
          source_url = EXCLUDED.source_url,
          is_demo = EXCLUDED.is_demo,
          updated_at = EXCLUDED.updated_at`,
        [
          alert.id, alert.alertType, alert.severity, alert.title, alert.summary, alert.details,
          alert.advice, alert.alternatives, alert.affectedRegions, alert.affectedAreaDescription,
          alert.affectedArea ? JSON.stringify(alert.affectedArea) : null,
          alert.startsAt, alert.endsAt, alert.source.provider, alert.source.name,
          alert.source.url ?? null, alert.source.isDemo, alert.createdAt, alert.updatedAt,
        ],
      );
    }
    await client.query('COMMIT');
    console.log(`Seeded ${seedDestinations.length} destinations, ${seedAchievements.length} achievements, and ${seedSafetyAlerts.length} safety alerts.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closePool);
