import {
  safetyAlertSchema,
  weatherResponseSchema,
  type ResolvedLocation,
  type SafetyAlert,
  type WeatherResponse,
} from '@saraya/contracts';

import { PagasaProviderUnavailableError, type PagasaProvider } from './pagasa.provider';

const observedAt = '2026-09-22T08:00:00.000Z';
const source = {
  provider: 'saraya-mock-pagasa',
  name: 'Saraya deterministic weather demonstration provider',
  isDemo: true,
} as const;

const regionWeather: Record<string, Omit<WeatherResponse, 'location' | 'source'>> = {
  'Bicol Region': {
    condition: 'Stormy demonstration conditions',
    temperatureCelsius: 25,
    precipitationProbability: 95,
    rainfallMillimeters: 42,
    warningState: 'advisory',
    summary: 'DEMO weather: heavy rain and strong winds are represented for safety-flow testing.',
    observedAt,
    providerStatus: 'available',
  },
  'National Capital Region': {
    condition: 'Cloudy with demonstration rain',
    temperatureCelsius: 29,
    precipitationProbability: 70,
    rainfallMillimeters: 8.4,
    warningState: 'advisory',
    summary: 'DEMO weather: intermittent heavy rain may affect sample urban routes.',
    observedAt,
    providerStatus: 'available',
  },
  'Central Visayas': {
    condition: 'Partly cloudy demonstration conditions',
    temperatureCelsius: 30,
    precipitationProbability: 40,
    rainfallMillimeters: 2,
    warningState: 'no-warning',
    summary: 'DEMO weather: variable cloud with isolated sample showers.',
    observedAt,
    providerStatus: 'available',
  },
  'Davao Region': {
    condition: 'Sunny intervals in the demonstration forecast',
    temperatureCelsius: 31,
    precipitationProbability: 25,
    rainfallMillimeters: 0,
    warningState: 'no-warning',
    summary: 'DEMO weather: warm conditions with a low sample rain probability.',
    observedAt,
    providerStatus: 'available',
  },
  'Cordillera Administrative Region': {
    condition: 'Cool with light demonstration rain',
    temperatureCelsius: 19,
    precipitationProbability: 65,
    rainfallMillimeters: 3,
    warningState: 'no-warning',
    summary: 'DEMO weather: cool mountain conditions with sample light rain.',
    observedAt,
    providerStatus: 'available',
  },
};

const demoWarning = safetyAlertSchema.parse({
  id: 'mock-provider-bicol-rain-warning',
  alertType: 'weather',
  severity: 'yellow',
  title: '[DEMO] Mock provider rain warning for Bicol',
  summary: 'Synthetic provider warning used to demonstrate normalized weather-alert ingestion.',
  details: 'This warning comes from Saraya\'s deterministic mock provider, not PAGASA.',
  advice: ['Check real PAGASA and LGU guidance before making a travel decision.'],
  alternatives: ['Delay exposed activities until current official conditions are verified.'],
  affectedRegions: ['Bicol Region'],
  affectedAreaDescription: 'Demonstration-wide Bicol Region warning',
  startsAt: '2026-01-01T00:00:00.000Z',
  endsAt: '2030-12-31T23:59:59.000Z',
  source,
  createdAt: observedAt,
  updatedAt: observedAt,
});

export class MockPagasaProvider implements PagasaProvider {
  constructor(private readonly shouldFail = false) {}

  async getWeather(location: ResolvedLocation) {
    if (this.shouldFail) throw new PagasaProviderUnavailableError();
    const weather = regionWeather[location.region] ?? {
      condition: 'Fair demonstration conditions',
      temperatureCelsius: 28,
      precipitationProbability: 20,
      rainfallMillimeters: 0,
      warningState: 'no-warning' as const,
      summary: 'DEMO weather: no sample warning is configured for this location.',
      observedAt,
      providerStatus: 'available' as const,
    };
    return weatherResponseSchema.parse({ ...weather, location, source });
  }

  async getActiveWarnings(location: ResolvedLocation): Promise<SafetyAlert[]> {
    if (this.shouldFail) throw new PagasaProviderUnavailableError();
    return location.region === 'Bicol Region' ? [demoWarning] : [];
  }
}

export function createPagasaProvider(): PagasaProvider {
  const provider = process.env.PAGASA_PROVIDER?.trim() || 'mock';
  if (provider !== 'mock') {
    throw new Error(`Unsupported PAGASA_PROVIDER "${provider}". Only the explicit mock provider is available.`);
  }
  return new MockPagasaProvider(process.env.PAGASA_MOCK_FAILURE === 'true');
}
