import { seedAchievements } from '../../modules/achievements/achievement.seed';
import { seedDestinations } from '../../modules/destinations/destination.seed';
import { closePool, getPool } from './pool';

async function seed() {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    for (const destination of seedDestinations) {
      await client.query(
        `INSERT INTO destinations (
          id, name, province, region, island_group, category, rating, summary, description,
          thumbnail_image_url, hero_tone, tags, highlights, best_for, location,
          historical_context, etiquette, local_phrase
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14,
          ST_SetSRID(ST_MakePoint($15, $16), 4326)::geography,
          $17, $18, $19
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
          thumbnail_image_url = EXCLUDED.thumbnail_image_url,
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
          destination.thumbnailImageUrl ?? null,
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
    await client.query('COMMIT');
    console.log(`Seeded ${seedDestinations.length} destinations and ${seedAchievements.length} achievements.`);
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
