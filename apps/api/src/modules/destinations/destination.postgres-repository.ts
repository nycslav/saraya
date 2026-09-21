import {
  destinationDetailSchema,
  destinationSummarySchema,
  type DestinationDetail,
  type DestinationSummary,
  type DiscoveryQuery,
} from '@saraya/contracts';
import type { QueryResultRow } from 'pg';

import { getPool } from '../../platform/database/pool';
import type { DestinationRepository } from './destination.repository';

interface DestinationRow extends QueryResultRow {
  id: string;
  name: string;
  province: string;
  region: string;
  island_group: string;
  category: string;
  rating: string | number;
  summary: string;
  hero_tone: string;
  tags: string[];
  latitude?: string | number;
  longitude?: string | number;
  description?: string;
  highlights?: string[];
  best_for?: string[];
  historical_context?: string;
  etiquette?: string[];
  local_phrase?: string;
}

const summaryColumns = `
  id, name, province, region, island_group, category, rating, summary, hero_tone, tags
`;

export class PostgresDestinationRepository implements DestinationRepository {
  async findAll(query: DiscoveryQuery): Promise<DestinationSummary[]> {
    const result = await getPool().query<DestinationRow>(
      `SELECT ${summaryColumns}
       FROM destinations
       WHERE ($1 = '' OR concat_ws(' ', name, province, region, category, array_to_string(tags, ' ')) ILIKE '%' || $1 || '%')
         AND ($2::text IS NULL OR island_group = $2)
         AND ($3::text IS NULL OR EXISTS (
           SELECT 1 FROM unnest(tags) AS tag WHERE lower(tag) = lower($3)
         ))
       ORDER BY rating DESC, name ASC`,
      [query.search, query.islandGroup ?? null, query.interest ?? null],
    );

    return result.rows.map((row) => destinationSummarySchema.parse(mapSummary(row)));
  }

  async findById(id: string): Promise<DestinationDetail | null> {
    const result = await getPool().query<DestinationRow>(
      `SELECT ${summaryColumns},
              ST_Y(location::geometry) AS latitude,
              ST_X(location::geometry) AS longitude,
              description, highlights, best_for, historical_context, etiquette, local_phrase
       FROM destinations
       WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return destinationDetailSchema.parse({
      ...mapSummary(row),
      coordinates: { latitude: Number(row.latitude), longitude: Number(row.longitude) },
      description: row.description,
      highlights: row.highlights,
      bestFor: row.best_for,
      culturalGuide: {
        historicalContext: row.historical_context,
        etiquette: row.etiquette,
        localPhrase: row.local_phrase,
      },
    });
  }
}

function mapSummary(row: DestinationRow) {
  return {
    id: row.id,
    name: row.name,
    province: row.province,
    region: row.region,
    islandGroup: row.island_group,
    category: row.category,
    rating: Number(row.rating),
    summary: row.summary,
    heroTone: row.hero_tone,
    tags: row.tags,
  };
}
