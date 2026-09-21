import {
  generatedItinerarySchema,
  tripPreferencesSchema,
  type GeneratedItinerary,
  type ItineraryDay,
  type ItineraryStop,
} from '@saraya/contracts';
import type { PoolClient, QueryResultRow } from 'pg';

import { getPool } from '../../platform/database/pool';
import type { ItineraryRepository } from './itinerary.repository';

interface ItineraryRow extends QueryResultRow {
  id: string;
  destination_id: string;
  generation_source: GeneratedItinerary['generationSource'];
  title: string;
  subtitle: string;
  preferences: unknown;
  generated_at: Date | string;
}

interface ItineraryDayRow extends QueryResultRow {
  day_number: number;
  title: string;
}

interface ItineraryStopRow extends QueryResultRow {
  day_number: number;
  id: string;
  time: string;
  title: string;
  detail: string;
  kind: ItineraryStop['kind'];
  place_provider: 'geoapify' | null;
  place_id: string | null;
  place_name: string | null;
  place_category: string | null;
  place_address: string | null;
  place_latitude: number | null;
  place_longitude: number | null;
}

export class PostgresItineraryRepository implements ItineraryRepository {
  async save(itinerary: GeneratedItinerary): Promise<void> {
    const client = await getPool().connect();

    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO itineraries (
          id, destination_id, generation_source, title, subtitle, preferences, generated_at
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
        ON CONFLICT (id) DO UPDATE SET
          destination_id = EXCLUDED.destination_id,
          generation_source = EXCLUDED.generation_source,
          title = EXCLUDED.title,
          subtitle = EXCLUDED.subtitle,
          preferences = EXCLUDED.preferences,
          generated_at = EXCLUDED.generated_at,
          updated_at = now()`,
        [
          itinerary.id,
          itinerary.destinationId,
          itinerary.generationSource,
          itinerary.title,
          itinerary.subtitle,
          JSON.stringify(itinerary.preferences),
          itinerary.generatedAt,
        ],
      );
      await client.query('DELETE FROM itinerary_days WHERE itinerary_id = $1', [itinerary.id]);

      for (const day of itinerary.days) {
        await insertDay(client, itinerary.id, day);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<GeneratedItinerary | null> {
    const pool = getPool();
    const itineraryResult = await pool.query<ItineraryRow>(
      `SELECT id, destination_id, generation_source, title, subtitle, preferences, generated_at
       FROM itineraries WHERE id = $1`,
      [id],
    );
    const itinerary = itineraryResult.rows[0];
    if (!itinerary) {
      return null;
    }

    const [daysResult, stopsResult] = await Promise.all([
      pool.query<ItineraryDayRow>(
        `SELECT day_number, title FROM itinerary_days
         WHERE itinerary_id = $1 ORDER BY day_number`,
        [id],
      ),
      pool.query<ItineraryStopRow>(
        `SELECT day_number, id, time, title, detail, kind,
           place_provider, place_id, place_name, place_category, place_address,
           place_latitude, place_longitude
         FROM itinerary_stops
         WHERE itinerary_id = $1 ORDER BY day_number, id`,
        [id],
      ),
    ]);

    return generatedItinerarySchema.parse({
      id: itinerary.id,
      destinationId: itinerary.destination_id,
      generationSource: itinerary.generation_source,
      title: itinerary.title,
      subtitle: itinerary.subtitle,
      preferences: tripPreferencesSchema.parse(itinerary.preferences),
      days: daysResult.rows.map((day) => ({
        dayNumber: day.day_number,
        title: day.title,
        stops: stopsResult.rows
          .filter((stop) => stop.day_number === day.day_number)
          .map((stop) => ({
            id: stop.id,
            time: stop.time,
            title: stop.title,
            detail: stop.detail,
            kind: stop.kind,
            ...(stop.place_id && stop.place_provider && stop.place_name && stop.place_category &&
              stop.place_address && stop.place_latitude !== null && stop.place_longitude !== null
              ? {
                  place: {
                    provider: stop.place_provider,
                    id: stop.place_id,
                    name: stop.place_name,
                    category: stop.place_category,
                    address: stop.place_address,
                    coordinates: {
                      latitude: stop.place_latitude,
                      longitude: stop.place_longitude,
                    },
                  },
                }
              : {}),
          })),
      })),
      generatedAt: new Date(itinerary.generated_at).toISOString(),
    });
  }
}

async function insertDay(client: PoolClient, itineraryId: string, day: ItineraryDay) {
  await client.query(
    'INSERT INTO itinerary_days (itinerary_id, day_number, title) VALUES ($1, $2, $3)',
    [itineraryId, day.dayNumber, day.title],
  );

  for (const stop of day.stops) {
    await client.query(
      `INSERT INTO itinerary_stops (
        itinerary_id, day_number, id, time, title, detail, kind,
        place_provider, place_id, place_name, place_category, place_address,
        place_latitude, place_longitude
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        itineraryId,
        day.dayNumber,
        stop.id,
        stop.time,
        stop.title,
        stop.detail,
        stop.kind,
        stop.place?.provider ?? null,
        stop.place?.id ?? null,
        stop.place?.name ?? null,
        stop.place?.category ?? null,
        stop.place?.address ?? null,
        stop.place?.coordinates.latitude ?? null,
        stop.place?.coordinates.longitude ?? null,
      ],
    );
  }
}
