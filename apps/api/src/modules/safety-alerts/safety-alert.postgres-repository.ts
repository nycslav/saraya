import {
  affectedAreaSchema,
  safetyAlertSchema,
  type Coordinates,
  type ResolvedLocation,
  type SafetyAlert,
  type SafetyAlertQuery,
} from '@saraya/contracts';
import type { QueryResultRow } from 'pg';

import { getPool } from '../../platform/database/pool';
import type { SafetyAlertRepository } from './safety-alert.repository';

interface SafetyAlertRow extends QueryResultRow {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  summary: string;
  details: string;
  advice: string[];
  alternatives: string[];
  affected_regions: string[];
  affected_area_description: string;
  affected_area?: string | Record<string, unknown>;
  starts_at: Date | string;
  ends_at: Date | string | null;
  source_provider: string;
  source_name: string;
  source_url: string | null;
  is_demo: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

interface DestinationLocationRow extends QueryResultRow {
  id: string;
  name: string;
  region: string;
  latitude: string | number;
  longitude: string | number;
}

const columns = `id, alert_type, severity, title, summary, details, advice, alternatives,
  affected_regions, affected_area_description,
  CASE WHEN affected_area IS NULL THEN NULL ELSE ST_AsGeoJSON(affected_area::geometry) END AS affected_area,
  starts_at, ends_at, source_provider, source_name, source_url, is_demo, created_at, updated_at`;

function iso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapAlert(row: SafetyAlertRow): SafetyAlert {
  const rawArea = typeof row.affected_area === 'string' ? JSON.parse(row.affected_area) : row.affected_area;
  const affectedArea = rawArea ? affectedAreaSchema.parse(rawArea) : undefined;
  return safetyAlertSchema.parse({
    id: row.id,
    alertType: row.alert_type,
    severity: row.severity,
    title: row.title,
    summary: row.summary,
    details: row.details,
    advice: row.advice,
    alternatives: row.alternatives,
    affectedRegions: row.affected_regions,
    affectedAreaDescription: row.affected_area_description,
    affectedArea,
    startsAt: iso(row.starts_at),
    endsAt: row.ends_at ? iso(row.ends_at) : null,
    source: {
      provider: row.source_provider,
      name: row.source_name,
      ...(row.source_url ? { url: row.source_url } : {}),
      isDemo: row.is_demo,
    },
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  });
}

export class PostgresSafetyAlertRepository implements SafetyAlertRepository {
  async findActive(
    location: ResolvedLocation,
    filters: Pick<SafetyAlertQuery, 'severity' | 'alertType'>,
    now: Date,
  ) {
    const result = await getPool().query<SafetyAlertRow>(
      `SELECT ${columns}
       FROM safety_alerts
       WHERE starts_at <= $1
         AND (ends_at IS NULL OR ends_at > $1)
         AND ($2::text IS NULL OR severity = $2)
         AND ($3::text IS NULL OR alert_type = $3)
         AND (
           ($4::double precision IS NOT NULL AND (
             (affected_area IS NOT NULL AND
               ST_Covers(affected_area, ST_SetSRID(ST_MakePoint($5, $4), 4326)::geography))
             OR (affected_area IS NULL AND $6 = ANY(affected_regions))
           ))
           OR ($4::double precision IS NULL AND $6 = ANY(affected_regions))
         )`,
      [
        now.toISOString(),
        filters.severity ?? null,
        filters.alertType ?? null,
        location.coordinates?.latitude ?? null,
        location.coordinates?.longitude ?? null,
        location.region,
      ],
    );
    return result.rows.map(mapAlert);
  }

  async findById(id: string) {
    const result = await getPool().query<SafetyAlertRow>(
      `SELECT ${columns} FROM safety_alerts WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? mapAlert(result.rows[0]) : null;
  }

  async resolveDestination(id: string): Promise<ResolvedLocation | null> {
    const result = await getPool().query<DestinationLocationRow>(
      `SELECT id, name, region, ST_Y(location::geometry) AS latitude, ST_X(location::geometry) AS longitude
       FROM destinations WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? {
      kind: 'destination',
      label: row.name,
      region: row.region,
      destinationId: row.id,
      coordinates: { latitude: Number(row.latitude), longitude: Number(row.longitude) },
    } : null;
  }

  async resolveCoordinates(coordinates: Coordinates): Promise<ResolvedLocation> {
    const result = await getPool().query<DestinationLocationRow>(
      `SELECT id, name, region, ST_Y(location::geometry) AS latitude, ST_X(location::geometry) AS longitude
       FROM destinations
       ORDER BY location <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
       LIMIT 1`,
      [coordinates.longitude, coordinates.latitude],
    );
    return {
      kind: 'coordinates',
      label: 'your current location',
      region: result.rows[0]?.region ?? 'Unknown region',
      coordinates,
    };
  }
}
