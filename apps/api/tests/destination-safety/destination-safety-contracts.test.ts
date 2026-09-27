import {
  destinationConditionsSchema,
  destinationSafetySubscriptionSchema,
} from '@saraya/contracts';

const source = { provider: 'open-meteo', name: 'Open-Meteo', isDemo: false };
const location = {
  kind: 'destination' as const,
  label: 'Cebu City',
  region: 'Central Visayas',
  destinationId: 'cebu-city',
  coordinates: { latitude: 10.3157, longitude: 123.8854 },
};

describe('destination safety contracts', () => {
  it('validates destination conditions including unavailable weather', () => {
    expect(destinationConditionsSchema.parse({
      destination: location,
      weather: {
        location,
        condition: null,
        temperatureCelsius: null,
        relativeHumidityPercent: null,
        apparentTemperatureCelsius: null,
        precipitationProbability: null,
        precipitationMillimeters: null,
        rainfallMillimeters: null,
        windSpeedKilometersPerHour: null,
        windDirectionDegrees: null,
        warningState: 'unavailable',
        summary: 'Weather data is unavailable. Saraya has not assumed that conditions are safe.',
        observedAt: null,
        fetchedAt: '2026-09-28T00:00:00.000Z',
        providerStatus: 'unavailable',
        source,
      },
      safetyAlerts: [],
      fetchedAt: '2026-09-28T00:00:00.000Z',
    }).weather.providerStatus).toBe('unavailable');
  });

  it('rejects a non-destination aggregate and invalid subscription status', () => {
    expect(() => destinationConditionsSchema.parse({ destination: { ...location, kind: 'region' } })).toThrow();
    expect(() => destinationSafetySubscriptionSchema.parse({
      destinationId: 'cebu-city', subscribed: 'yes', createdAt: null,
    })).toThrow();
  });
});
