import { readWeatherConfiguration, type WeatherConfiguration } from '../../platform/config/weather-config';
import { MockWeatherProvider } from './mock-weather.provider';
import { OpenMeteoWeatherProvider } from './open-meteo-weather.provider';
import type { WeatherCache } from './weather.cache';
import type { WeatherProvider } from './weather.provider';

export * from './mock-weather.provider';
export * from './open-meteo-weather.provider';
export * from './weather.cache';
export * from './weather.provider';
export * from './wmo-weather-code';

export function createWeatherProvider(
  configuration: WeatherConfiguration = readWeatherConfiguration(),
  dependencies: { fetcher?: typeof fetch; cache?: WeatherCache } = {},
): WeatherProvider {
  if (configuration.provider === 'mock') return new MockWeatherProvider();
  return new OpenMeteoWeatherProvider({
    baseUrl: configuration.openMeteoBaseUrl,
    fetcher: dependencies.fetcher,
    cache: dependencies.cache,
  });
}
