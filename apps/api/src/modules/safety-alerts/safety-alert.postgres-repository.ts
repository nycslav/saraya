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

interface RegionLocationRow extends QueryResultRow {
  latitude: string | number | null;
  longitude: string | number | null;
}

interface ProviderStateRow extends QueryResultRow {
  last_checked_at: Date | string;
  last_succeeded_at: Date | string | null;
  last_error_code: string | null;
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
  constructor(private readonly includeDemo = false) {}

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
         AND ($7::boolean OR NOT is_demo)
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
        this.includeDemo,
      ],
    );
    return result.rows.map(mapAlert);
  }

  async findById(id: string) {
    const result = await getPool().query<SafetyAlertRow>(
      `SELECT ${columns} FROM safety_alerts WHERE id = $1 AND ($2::boolean OR NOT is_demo)`,
      [id, this.includeDemo],
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

  async resolveRegion(region: string): Promise<ResolvedLocation> {
    const result = await getPool().query<RegionLocationRow>(
      `SELECT AVG(ST_Y(location::geometry)) AS latitude,
              AVG(ST_X(location::geometry)) AS longitude
       FROM destinations
       WHERE region = $1`,
      [region],
    );
    const row = result.rows[0];
    const hasCoordinates = row?.latitude !== null && row?.latitude !== undefined &&
      row.longitude !== null && row.longitude !== undefined;
    return {
      kind: 'region',
      label: region,
      region,
      ...(hasCoordinates ? {
        coordinates: { latitude: Number(row.latitude), longitude: Number(row.longitude) },
      } : {}),
    };
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

  async upsertFromProvider(alert: SafetyAlert) {
    const affectedArea = alert.affectedArea ? JSON.stringify(alert.affectedArea) : null;
    const result = await getPool().query(
      `INSERT INTO safety_alerts (
         id, alert_type, severity, title, summary, details, advice, alternatives,
         affected_regions, affected_area_description, affected_area, starts_at, ends_at,
         source_provider, source_name, source_url, is_demo, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
         CASE WHEN $11::jsonb IS NULL THEN NULL ELSE ST_Multi(ST_GeomFromGeoJSON($11::jsonb))::geography END,
         $12, $13, $14, $15, $16, false, $17, $18
       )
       ON CONFLICT (id) DO UPDATE SET
         alert_type = EXCLUDED.alert_type, severity = EXCLUDED.severity, title = EXCLUDED.title,
         summary = EXCLUDED.summary, details = EXCLUDED.details, advice = EXCLUDED.advice,
         alternatives = EXCLUDED.alternatives, affected_regions = EXCLUDED.affected_regions,
         affected_area_description = EXCLUDED.affected_area_description,
         affected_area = EXCLUDED.affected_area, starts_at = EXCLUDED.starts_at,
         ends_at = EXCLUDED.ends_at, source_provider = EXCLUDED.source_provider,
         source_name = EXCLUDED.source_name, source_url = EXCLUDED.source_url,
         is_demo = false, updated_at = EXCLUDED.updated_at
       WHERE (safety_alerts.alert_type, safety_alerts.severity, safety_alerts.title,
              safety_alerts.summary, safety_alerts.details, safety_alerts.advice,
              safety_alerts.alternatives, safety_alerts.affected_regions,
              safety_alerts.affected_area_description, safety_alerts.starts_at,
              safety_alerts.ends_at, safety_alerts.source_provider, safety_alerts.source_name,
              safety_alerts.source_url, safety_alerts.is_demo, safety_alerts.updated_at)
         IS DISTINCT FROM
             (EXCLUDED.alert_type, EXCLUDED.severity, EXCLUDED.title,
              EXCLUDED.summary, EXCLUDED.details, EXCLUDED.advice,
              EXCLUDED.alternatives, EXCLUDED.affected_regions,
              EXCLUDED.affected_area_description, EXCLUDED.starts_at,
              EXCLUDED.ends_at, EXCLUDED.source_provider, EXCLUDED.source_name,
              EXCLUDED.source_url, EXCLUDED.is_demo, EXCLUDED.updated_at)
       RETURNING id`,
      [alert.id, alert.alertType, alert.severity, alert.title, alert.summary, alert.details,
        alert.advice, alert.alternatives, alert.affectedRegions, alert.affectedAreaDescription,
        affectedArea, alert.startsAt, alert.endsAt, alert.source.provider, alert.source.name,
        alert.source.url ?? null, alert.createdAt, alert.updatedAt],
    );
    return Boolean(result.rowCount);
  }

  async expireMissing(provider: string, activeIds: string[], now: Date) {
    const result = await getPool().query(
      `UPDATE safety_alerts
       SET ends_at = $3, updated_at = $3
       WHERE source_provider = $1 AND NOT is_demo
         AND NOT (id = ANY($2::text[]))
         AND (ends_at IS NULL OR ends_at > $3)`,
      [provider, activeIds, now.toISOString()],
    );
    return result.rowCount ?? 0;
  }

  async recordProviderSuccess(provider: string, checkedAt: Date) {
    await getPool().query(
      `INSERT INTO warning_ingestion_state (provider, last_checked_at, last_succeeded_at, last_error_code)
       VALUES ($1, $2, $2, NULL)
       ON CONFLICT (provider) DO UPDATE SET last_checked_at = EXCLUDED.last_checked_at,
         last_succeeded_at = EXCLUDED.last_succeeded_at, last_error_code = NULL, updated_at = now()`,
      [provider, checkedAt.toISOString()],
    );
  }

  async recordProviderFailure(provider: string, checkedAt: Date, errorCode: string) {
    await getPool().query(
      `INSERT INTO warning_ingestion_state (provider, last_checked_at, last_error_code)
       VALUES ($1, $2, $3)
       ON CONFLICT (provider) DO UPDATE SET last_checked_at = EXCLUDED.last_checked_at,
         last_error_code = EXCLUDED.last_error_code, updated_at = now()`,
      [provider, checkedAt.toISOString(), errorCode],
    );
  }

  async getWarningProviderStatus(provider: string) {
    const result = await getPool().query<ProviderStateRow>(
      `SELECT last_checked_at, last_succeeded_at, last_error_code
       FROM warning_ingestion_state WHERE provider = $1`,
      [provider],
    );
    const row = result.rows[0];
    return row ? {
      status: row.last_error_code ? 'unavailable' as const : 'fresh' as const,
      lastCheckedAt: iso(row.last_checked_at),
      lastSucceededAt: row.last_succeeded_at ? iso(row.last_succeeded_at) : null,
    } : { status: 'unavailable' as const, lastCheckedAt: null, lastSucceededAt: null };
  }
}
