import type { WeatherCache, WeatherCacheEntry } from '../../src/integrations/weather';
import {
  OpenMeteoWeatherProvider,
  WeatherProviderUnavailableError,
} from '../../src/integrations/weather';

const location = {
  kind: 'coordinates',
  label: 'your current location',
  region: 'National Capital Region',
  coordinates: { latitude: 14.6, longitude: 121 },
} as const;

const validPayload = {
  latitude: 14.625,
  longitude: 121,
  current_units: {
    time: 'iso8601', interval: 'seconds', temperature_2m: '°C', relative_humidity_2m: '%',
    apparent_temperature: '°C', precipitation: 'mm', weather_code: 'wmo code',
    wind_speed_10m: 'km/h', wind_direction_10m: '°',
  },
  current: {
    time: '2026-09-23T04:15', interval: 900, temperature_2m: 29.4,
    relative_humidity_2m: 78, apparent_temperature: 34.2, precipitation: 0.7,
    weather_code: 61, wind_speed_10m: 14.5, wind_direction_10m: 240,
  },
};

function response(payload: unknown = validPayload, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: jest.fn().mockResolvedValue(payload) };
}

class MemoryWeatherCache implements WeatherCache {
  entry: WeatherCacheEntry | null = null;
  key?: string;

  async get(key: string) {
    this.key = key;
    return this.entry;
  }

  async set(key: string, entry: WeatherCacheEntry) {
    this.key = key;
    this.entry = structuredClone(entry);
  }
}

describe('OpenMeteoWeatherProvider', () => {
  it('requests documented current variables and normalizes validated units and timestamps', async () => {
    const fetcher = jest.fn().mockResolvedValue(response());
    const provider = new OpenMeteoWeatherProvider({
      fetcher: fetcher as unknown as typeof fetch,
      now: () => new Date('2026-09-23T04:16:00.000Z'),
    });

    await expect(provider.getWeather(location)).resolves.toEqual(expect.objectContaining({
      condition: 'Rain',
      temperatureCelsius: 29.4,
      relativeHumidityPercent: 78,
      apparentTemperatureCelsius: 34.2,
      precipitationMillimeters: 0.7,
      windSpeedKilometersPerHour: 14.5,
      windDirectionDegrees: 240,
      observedAt: '2026-09-23T04:15:00.000Z',
      fetchedAt: '2026-09-23T04:16:00.000Z',
      providerStatus: 'fresh',
      warningState: 'unavailable',
      source: expect.objectContaining({ provider: 'open-meteo', name: 'Open-Meteo', isDemo: false }),
    }));

    const requestedUrl = fetcher.mock.calls[0]?.[0] as URL;
    expect(requestedUrl.origin + requestedUrl.pathname).toBe('https://api.open-meteo.com/v1/forecast');
    expect(requestedUrl.searchParams.get('current')).toBe(
      'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m',
    );
    expect(requestedUrl.searchParams.get('temperature_unit')).toBe('celsius');
    expect(requestedUrl.searchParams.get('wind_speed_unit')).toBe('kmh');
    expect(requestedUrl.searchParams.get('precipitation_unit')).toBe('mm');
    expect(requestedUrl.searchParams.get('timezone')).toBe('UTC');
    expect(requestedUrl.searchParams.has('apikey')).toBe(false);
  });

  it('rejects malformed upstream data and incorrect units', async () => {
    const malformed = { ...validPayload, current_units: { ...validPayload.current_units, wind_speed_10m: 'mph' } };
    const provider = new OpenMeteoWeatherProvider({
      fetcher: jest.fn().mockResolvedValue(response(malformed)) as unknown as typeof fetch,
    });
    await expect(provider.getWeather(location)).rejects.toBeInstanceOf(WeatherProviderUnavailableError);
  });

  it.each([400, 404, 500, 503])('normalizes upstream HTTP %s failure', async (status) => {
    const provider = new OpenMeteoWeatherProvider({
      fetcher: jest.fn().mockResolvedValue(response({}, status)) as unknown as typeof fetch,
    });
    await expect(provider.getWeather(location)).rejects.toThrow(`status ${status}`);
  });

  it('normalizes network failure', async () => {
    const provider = new OpenMeteoWeatherProvider({
      fetcher: jest.fn().mockRejectedValue(new Error('socket closed')) as unknown as typeof fetch,
    });
    await expect(provider.getWeather(location)).rejects.toBeInstanceOf(WeatherProviderUnavailableError);
  });

  it('aborts an upstream request after the configured timeout', async () => {
    const fetcher = jest.fn().mockImplementation((_url: URL, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(init.signal?.reason));
    }));
    const provider = new OpenMeteoWeatherProvider({
      fetcher: fetcher as unknown as typeof fetch,
      timeoutMilliseconds: 1,
    });
    await expect(provider.getWeather(location)).rejects.toBeInstanceOf(WeatherProviderUnavailableError);
  });

  it('uses the safe unknown-code fallback', async () => {
    const payload = { ...validPayload, current: { ...validPayload.current, weather_code: 42 } };
    const provider = new OpenMeteoWeatherProvider({
      fetcher: jest.fn().mockResolvedValue(response(payload)) as unknown as typeof fetch,
    });
    await expect(provider.getWeather(location)).resolves.toEqual(
      expect.objectContaining({ condition: 'Unknown conditions' }),
    );
  });

  it('returns cached data as stale after upstream failure without retaining precise coordinates', async () => {
    const cache = new MemoryWeatherCache();
    const now = new Date('2026-09-23T04:16:00.000Z');
    const first = new OpenMeteoWeatherProvider({
      cache,
      fetcher: jest.fn().mockResolvedValue(response()) as unknown as typeof fetch,
      now: () => now,
    });
    await first.getWeather(location);
    expect(cache.key).toBe('weather:14.60:121.00');
    expect(cache.entry?.weather).not.toHaveProperty('location');

    cache.entry!.cachedAt = now.getTime() - 31 * 60 * 1_000;
    const failing = new OpenMeteoWeatherProvider({
      cache,
      fetcher: jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch,
      now: () => now,
    });
    await expect(failing.getWeather(location)).resolves.toEqual(expect.objectContaining({
      providerStatus: 'stale',
      location,
    }));
  });

  it('returns a fresh cached response within 30 minutes without another request', async () => {
    const cache = new MemoryWeatherCache();
    const fetcher = jest.fn().mockResolvedValue(response());
    const now = new Date('2026-09-23T04:16:00.000Z');
    const provider = new OpenMeteoWeatherProvider({
      cache, fetcher: fetcher as unknown as typeof fetch, now: () => now,
    });
    await provider.getWeather(location);
    await provider.getWeather(location);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
