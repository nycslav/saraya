import type { DestinationDetail } from '@saraya/contracts';
import { z } from 'zod';

import '../../platform/config/load-env';
import type { PlaceCandidate, PlacesProvider } from './places.provider';

const geoapifyFeatureCollectionSchema = z.object({
  features: z.array(
    z.object({
      properties: z.object({
        place_id: z.string().min(1),
        name: z.string().min(1).optional(),
        formatted: z.string().min(1).optional(),
        address_line1: z.string().min(1).optional(),
        address_line2: z.string().min(1).optional(),
        categories: z.array(z.string().min(1)).default([]),
        lat: z.number(),
        lon: z.number(),
      }),
    }),
  ),
});

const PLACE_CATEGORIES = [
  'catering.restaurant',
  'catering.cafe',
  'catering.fast_food',
  'tourism.attraction',
  'tourism.sights',
  'accommodation.hotel',
  'accommodation.hostel',
  'entertainment.museum',
];

interface CachedCandidates {
  expiresAt: number;
  candidates: PlaceCandidate[];
}

export class GeoapifyPlacesProvider implements PlacesProvider {
  private readonly cache = new Map<string, CachedCandidates>();

  constructor(
    private readonly apiKey = process.env.GEOAPIFY_API_KEY,
    private readonly fetcher: typeof fetch = fetch,
    private readonly now: () => number = Date.now,
  ) {}

  async findNearby(destination: DestinationDetail): Promise<PlaceCandidate[]> {
    if (!this.apiKey) {
      return [];
    }

    const cacheKey = destination.id;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > this.now()) {
      return structuredClone(cached.candidates);
    }

    const radius = readBoundedInteger(process.env.GEOAPIFY_RADIUS_METERS, 15_000, 1_000, 50_000);
    const limit = readBoundedInteger(process.env.GEOAPIFY_PLACE_LIMIT, 60, 1, 100);
    const { latitude, longitude } = destination.coordinates;
    const url = new URL('https://api.geoapify.com/v2/places');
    url.searchParams.set('categories', PLACE_CATEGORIES.join(','));
    url.searchParams.set('filter', `circle:${longitude},${latitude},${radius}`);
    url.searchParams.set('bias', `proximity:${longitude},${latitude}`);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('apiKey', this.apiKey);

    const response = await this.fetcher(url, { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) {
      throw new Error(`Geoapify places request failed with status ${response.status}.`);
    }

    const payload = geoapifyFeatureCollectionSchema.parse(await response.json());
    const candidates = deduplicateCandidates(payload.features
      .flatMap(({ properties }) => {
        if (!properties.name) {
          return [];
        }

        return [{
          provider: 'geoapify' as const,
          id: properties.place_id,
          name: properties.name,
          category: normalizeCategory(properties.categories),
          address: properties.formatted ?? (
            [properties.address_line1, properties.address_line2].filter(Boolean).join(', ') ||
            destination.name
          ),
          coordinates: {
            latitude: properties.lat,
            longitude: properties.lon,
          },
        }];
      }));

    this.cache.set(cacheKey, {
      expiresAt: this.now() + 15 * 60 * 1_000,
      candidates,
    });

    return structuredClone(candidates);
  }
}

function deduplicateCandidates(candidates: PlaceCandidate[]) {
  return [...new Map(candidates.map((candidate) => [candidate.id, candidate])).values()];
}

function normalizeCategory(categories: string[]) {
  const category = categories.find((value) =>
    value.startsWith('catering.') ||
    value.startsWith('tourism.') ||
    value.startsWith('accommodation.') ||
    value.startsWith('entertainment.'),
  );

  return (category ?? 'tourism.attraction').replaceAll('.', ' ');
}

function readBoundedInteger(raw: string | undefined, fallback: number, minimum: number, maximum: number) {
  const value = Number(raw);
  return Number.isInteger(value) && value >= minimum && value <= maximum ? value : fallback;
}
