import { weatherResponseSchema, type ResolvedLocation, type WeatherResponse } from '@saraya/contracts';

import { WeatherProviderUnavailableError, type WeatherProvider } from './weather.provider';

const observedAt = '2026-09-22T08:00:00.000Z';
const fetchedAt = '2026-09-22T08:01:00.000Z';

const regionWeather: Record<string, Partial<WeatherResponse>> = {
  'Bicol Region': { condition: 'Rain', temperatureCelsius: 25, precipitationMillimeters: 42 },
  'National Capital Region': { condition: 'Cloudy', temperatureCelsius: 29, precipitationMillimeters: 8.4 },
  'Central Visayas': { condition: 'Partly cloudy', temperatureCelsius: 30, precipitationMillimeters: 2 },
  'Davao Region': { condition: 'Clear', temperatureCelsius: 31, precipitationMillimeters: 0 },
  'Cordillera Administrative Region': { condition: 'Drizzle', temperatureCelsius: 19, precipitationMillimeters: 3 },
};

export class MockWeatherProvider implements WeatherProvider {
  readonly source = {
    provider: 'saraya-mock-weather',
    name: 'Saraya deterministic weather demonstration provider',
    isDemo: true,
  } as const;

  constructor(private readonly shouldFail = false) {}

  async getWeather(location: ResolvedLocation) {
    if (this.shouldFail) throw new WeatherProviderUnavailableError();
    const configured = regionWeather[location.region] ?? {};
    return weatherResponseSchema.parse({
      location,
      condition: configured.condition ?? 'Clear',
      temperatureCelsius: configured.temperatureCelsius ?? 28,
      relativeHumidityPercent: 72,
      apparentTemperatureCelsius: (configured.temperatureCelsius ?? 28) + 2,
      precipitationProbability: null,
      precipitationMillimeters: configured.precipitationMillimeters ?? 0,
      rainfallMillimeters: null,
      windSpeedKilometersPerHour: 12,
      windDirectionDegrees: 90,
      warningState: 'unavailable',
      summary: 'DEMO model-style weather. Safety warnings are provided by a separate mock warning provider.',
      observedAt,
      fetchedAt,
      providerStatus: 'fresh',
      source: this.source,
    });
  }
}
