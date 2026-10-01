import type { WeatherResponse } from '@saraya/contracts';

export type CachedWeatherData = Omit<WeatherResponse, 'location'>;

export interface WeatherCacheEntry {
  cachedAt: number;
  weather: CachedWeatherData;
}

export interface WeatherCache {
  get(key: string): Promise<WeatherCacheEntry | null>;
  set(key: string, entry: WeatherCacheEntry): Promise<void>;
}

export class NoopWeatherCache implements WeatherCache {
  async get() {
    return null;
  }

  async set() {
    // The shared Redis cache layer is not operational yet.
  }
}

export function createWeatherCacheKey(latitude: number, longitude: number) {
  return `weather:${latitude.toFixed(2)}:${longitude.toFixed(2)}`;
}
