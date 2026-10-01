import {
  festivalCulturalGuideSchema,
  festivalDetailSchema,
  festivalDetailWithCultureSchema,
  festivalSummarySchema,
  type FestivalCulturalGuide,
  type FestivalDetail,
  type FestivalQuery,
} from '@saraya/contracts';
import type { QueryResultRow } from 'pg';

import { getPool } from '../../platform/database/pool';
import type { FestivalRepository } from './festival.repository';

interface FestivalRow extends QueryResultRow {
  festival_data: unknown;
  guide_data?: unknown;
}

function parseJsonColumn(value: unknown) {
  return typeof value === 'string' ? (JSON.parse(value) as unknown) : value;
}

function mapFestival(row: FestivalRow): FestivalDetail {
  return festivalDetailSchema.parse(parseJsonColumn(row.festival_data));
}

function mapCulturalGuide(row: FestivalRow): FestivalCulturalGuide {
  return festivalCulturalGuideSchema.parse(parseJsonColumn(row.guide_data));
}

const queryFilters = `
  ($1 = '' OR concat_ws(
    ' ', name, city, province, region, festival_data->>'category',
    array_to_string(ARRAY(SELECT jsonb_array_elements_text(festival_data->'tags')), ' ')
  ) ILIKE '%' || $1 || '%')
  AND ($2::text IS NULL OR region = $2)
  AND ($3::smallint IS NULL OR typical_month = $3)
`;

export class PostgresFestivalRepository implements FestivalRepository {
  async findAll(query: FestivalQuery) {
    const result = await getPool().query<FestivalRow>(
      `SELECT festival_data
       FROM festivals
       WHERE ${queryFilters}
       ORDER BY name ASC`,
      [query.search ?? '', query.region ?? null, query.month ?? null],
    );
    return result.rows.map((row) => festivalSummarySchema.parse(mapFestival(row)));
  }

  async findUpcoming(query: FestivalQuery, currentMonth: number) {
    const result = await getPool().query<FestivalRow>(
      `SELECT festival_data
       FROM festivals
       WHERE ${queryFilters}
       ORDER BY MOD(typical_month - $4 + 12, 12), name ASC`,
      [query.search ?? '', query.region ?? null, query.month ?? null, currentMonth],
    );
    return result.rows.map((row) => festivalSummarySchema.parse(mapFestival(row)));
  }

  async findById(id: string) {
    const result = await getPool().query<FestivalRow>(
      `SELECT f.festival_data, g.guide_data
       FROM festivals f
       JOIN festival_cultural_guides g ON g.festival_id = f.id
       WHERE f.id = $1`,
      [id],
    );
    const row = result.rows[0];
    if (!row) return null;

    return festivalDetailWithCultureSchema.parse({
      ...mapFestival(row),
      culturalGuide: mapCulturalGuide(row),
    });
  }
}
