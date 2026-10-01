import { weatherResponseSchema, type ResolvedLocation, type WeatherResponse } from '@saraya/contracts';
import { z } from 'zod';

import {
  createWeatherCacheKey,
  NoopWeatherCache,
  type WeatherCache,
  type WeatherCacheEntry,
} from './weather.cache';
import { WeatherProviderUnavailableError, type WeatherProvider } from './weather.provider';
import { mapWmoWeatherCode } from './wmo-weather-code';

const currentVariables = [
  'temperature_2m',
  'relative_humidity_2m',
  'apparent_temperature',
  'precipitation',
  'weather_code',
  'wind_speed_10m',
  'wind_direction_10m',
] as const;

const openMeteoResponseSchema = z.object({
  current_units: z.object({
    time: z.literal('iso8601'),
    interval: z.literal('seconds'),
    temperature_2m: z.literal('°C'),
    relative_humidity_2m: z.literal('%'),
    apparent_temperature: z.literal('°C'),
    precipitation: z.literal('mm'),
    weather_code: z.literal('wmo code'),
    wind_speed_10m: z.literal('km/h'),
    wind_direction_10m: z.literal('°'),
  }),
  current: z.object({
    time: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/),
    interval: z.number().positive(),
    temperature_2m: z.number(),
    relative_humidity_2m: z.number().min(0).max(100),
    apparent_temperature: z.number(),
    precipitation: z.number().min(0),
    weather_code: z.number().int(),
    wind_speed_10m: z.number().min(0),
    wind_direction_10m: z.number().min(0).max(360),
  }),
});

const OPEN_METEO_SOURCE = {
  provider: 'open-meteo',
  name: 'Open-Meteo',
  url: 'https://open-meteo.com/',
  isDemo: false,
} as const;

const FRESH_WINDOW_MS = 30 * 60 * 1_000;
const STALE_WINDOW_MS = 2 * 60 * 60 * 1_000;

export interface OpenMeteoWeatherProviderOptions {
  baseUrl?: string;
  apiKey?: string;
  fetcher?: typeof fetch;
  cache?: WeatherCache;
  now?: () => Date;
  timeoutMilliseconds?: number;
}

export class OpenMeteoWeatherProvider implements WeatherProvider {
  readonly source = OPEN_METEO_SOURCE;
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly fetcher: typeof fetch;
  private readonly cache: WeatherCache;
  private readonly now: () => Date;
  private readonly timeoutMilliseconds: number;

  constructor(options: OpenMeteoWeatherProviderOptions = {}) {
    this.baseUrl = (options.baseUrl ?? 'https://api.open-meteo.com/v1').replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.fetcher = options.fetcher ?? fetch;
    this.cache = options.cache ?? new NoopWeatherCache();
    this.now = options.now ?? (() => new Date());
    this.timeoutMilliseconds = options.timeoutMilliseconds ?? 8_000;
  }

  async getWeather(location: ResolvedLocation): Promise<WeatherResponse> {
    if (!location.coordinates) {
      throw new WeatherProviderUnavailableError('Open-Meteo requires resolved coordinates.');
    }

    const { latitude, longitude } = location.coordinates;
    const cacheKey = createWeatherCacheKey(latitude, longitude);
    const now = this.now();
    const cached = await this.readCache(cacheKey);
    if (cached && now.getTime() - cached.cachedAt <= FRESH_WINDOW_MS) {
      return weatherResponseSchema.parse({ ...cached.weather, location, providerStatus: 'fresh' });
    }

    try {
      const response = await this.fetcher(this.createUrl(latitude, longitude), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(this.timeoutMilliseconds),
      });
      if (!response.ok) {
        throw new WeatherProviderUnavailableError(
          `Open-Meteo request failed with status ${response.status}.`,
        );
      }

      const upstream = openMeteoResponseSchema.parse(await response.json());
      const weather = weatherResponseSchema.parse({
        location,
        condition: mapWmoWeatherCode(upstream.current.weather_code),
        temperatureCelsius: upstream.current.temperature_2m,
        relativeHumidityPercent: upstream.current.relative_humidity_2m,
        apparentTemperatureCelsius: upstream.current.apparent_temperature,
        precipitationProbability: null,
        precipitationMillimeters: upstream.current.precipitation,
        rainfallMillimeters: null,
        windSpeedKilometersPerHour: upstream.current.wind_speed_10m,
        windDirectionDegrees: upstream.current.wind_direction_10m,
        warningState: 'unavailable',
        summary: 'Model-derived current weather from Open-Meteo. Official safety warnings are provided separately.',
        observedAt: normalizeUtcTimestamp(upstream.current.time),
        fetchedAt: now.toISOString(),
        providerStatus: 'fresh',
        source: this.source,
      });
      await this.writeCache(cacheKey, weather, now.getTime());
      return weather;
    } catch (error) {
      if (cached && now.getTime() - cached.cachedAt <= STALE_WINDOW_MS) {
        return weatherResponseSchema.parse({
          ...cached.weather,
          location,
          providerStatus: 'stale',
          summary: `${cached.weather.summary} Cached weather is shown because the provider is unavailable.`,
        });
      }
      if (error instanceof WeatherProviderUnavailableError) throw error;
      throw new WeatherProviderUnavailableError('Open-Meteo weather retrieval failed.', { cause: error });
    }
  }

  private createUrl(latitude: number, longitude: number) {
    const url = new URL(`${this.baseUrl}/forecast`);
    url.searchParams.set('latitude', String(latitude));
    url.searchParams.set('longitude', String(longitude));
    url.searchParams.set('current', currentVariables.join(','));
    url.searchParams.set('temperature_unit', 'celsius');
    url.searchParams.set('wind_speed_unit', 'kmh');
    url.searchParams.set('precipitation_unit', 'mm');
    url.searchParams.set('timezone', 'UTC');
    if (this.apiKey) url.searchParams.set('apikey', this.apiKey);
    return url;
  }

  private async readCache(key: string) {
    try {
      return await this.cache.get(key);
    } catch {
      return null;
    }
  }

  private async writeCache(key: string, response: WeatherResponse, cachedAt: number) {
    const { location: _location, ...weather } = response;
    const entry: WeatherCacheEntry = { cachedAt, weather };
    try {
      await this.cache.set(key, entry);
    } catch {
      // Cache availability must not turn a successful provider response into a failure.
    }
  }
}

function normalizeUtcTimestamp(value: string) {
  return new Date(`${value}Z`).toISOString();
}

export { currentVariables, openMeteoResponseSchema };
