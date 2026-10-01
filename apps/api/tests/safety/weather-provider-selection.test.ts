import { createWeatherProvider, MockWeatherProvider, OpenMeteoWeatherProvider } from '../../src/integrations/weather';
import { readWeatherConfiguration } from '../../src/platform/config/weather-config';

describe('weather provider selection', () => {
  it('selects Open-Meteo and mock providers explicitly', () => {
    expect(createWeatherProvider({ provider: 'open_meteo', openMeteoBaseUrl: 'https://api.open-meteo.com/v1' }))
      .toBeInstanceOf(OpenMeteoWeatherProvider);
    expect(createWeatherProvider({ provider: 'mock', openMeteoBaseUrl: 'https://api.open-meteo.com/v1' }))
      .toBeInstanceOf(MockWeatherProvider);
  });

  it('defaults to Open-Meteo outside tests, keeps tests offline, and rejects invalid configuration', () => {
    expect(readWeatherConfiguration({})).toEqual({
      provider: 'open_meteo', openMeteoBaseUrl: 'https://api.open-meteo.com/v1',
    });
    expect(readWeatherConfiguration({ NODE_ENV: 'test' })).toEqual({
      provider: 'mock', openMeteoBaseUrl: 'https://api.open-meteo.com/v1',
    });
    expect(() => readWeatherConfiguration({ WEATHER_PROVIDER: 'pagasa' })).toThrow();
    expect(() => readWeatherConfiguration({ WEATHER_PROVIDER: 'open_meteo', OPEN_METEO_BASE_URL: 'not-a-url' })).toThrow();
  });
});
