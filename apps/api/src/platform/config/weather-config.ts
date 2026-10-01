import { z } from 'zod';

import './load-env';

const weatherConfigurationSchema = z.object({
  WEATHER_PROVIDER: z.enum(['open_meteo', 'mock']),
  OPEN_METEO_BASE_URL: z.string().url().default('https://api.open-meteo.com/v1'),
});

export interface WeatherConfiguration {
  provider: 'open_meteo' | 'mock';
  openMeteoBaseUrl: string;
}

export function readWeatherConfiguration(
  environment: Record<string, string | undefined> = process.env,
): WeatherConfiguration {
  const parsed = weatherConfigurationSchema.parse({
    ...environment,
    WEATHER_PROVIDER: environment.WEATHER_PROVIDER ?? (
      environment.NODE_ENV === 'test' ? 'mock' : 'open_meteo'
    ),
  });
  return {
    provider: parsed.WEATHER_PROVIDER,
    openMeteoBaseUrl: parsed.OPEN_METEO_BASE_URL.replace(/\/$/, ''),
  };
}
