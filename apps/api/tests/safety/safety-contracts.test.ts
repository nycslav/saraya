import {
  safetyAlertQuerySchema,
  safetyAlertSchema,
  weatherQuerySchema,
  weatherResponseSchema,
} from '@saraya/contracts';

import safetyAlertSeeds from '../../../../database/seeds/safety-alerts.json';

const validAlert = safetyAlertSeeds[0];
const validWeather = {
  location: { kind: 'region', label: 'Bicol Region', region: 'Bicol Region' },
  condition: 'Demo rain',
  temperatureCelsius: 25,
  precipitationProbability: 90,
  rainfallMillimeters: 12,
  warningState: 'advisory',
  summary: 'Synthetic weather context for an offline test.',
  observedAt: '2026-09-22T08:00:00.000Z',
  providerStatus: 'available',
  source: { provider: 'test', name: 'Test provider', isDemo: true },
};

describe('safety and weather contracts', () => {
  it('accepts contract-valid alerts and weather responses', () => {
    expect(() => safetyAlertSchema.parse(validAlert)).not.toThrow();
    expect(() => weatherResponseSchema.parse(validWeather)).not.toThrow();
  });

  it.each([
    { latitude: 14.6, longitude: 121 },
    { region: 'National Capital Region' },
    { destinationId: 'cebu-city' },
  ])('accepts one location context: %p', (query) => {
    expect(() => safetyAlertQuerySchema.parse(query)).not.toThrow();
    expect(() => weatherQuerySchema.parse(query)).not.toThrow();
  });

  it.each([
    { latitude: -91, longitude: 121 },
    { latitude: 14, longitude: 181 },
    { region: 'Bicol Region', destinationId: 'cebu-city' },
    { latitude: 14 },
    {},
  ])('rejects invalid location queries: %p', (query) => {
    expect(() => safetyAlertQuerySchema.parse(query)).toThrow();
  });

  it('rejects invalid filters and malformed timestamps', () => {
    expect(() => safetyAlertQuerySchema.parse({ region: 'Bicol Region', severity: 'orange' })).toThrow();
    expect(() => safetyAlertQuerySchema.parse({ region: 'Bicol Region', alertType: 'earthquake' })).toThrow();
    expect(() => safetyAlertSchema.parse({ ...validAlert, startsAt: 'tomorrow' })).toThrow();
  });
});
