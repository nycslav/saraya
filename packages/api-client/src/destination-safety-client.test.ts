import {
  destinationConditionsSchema,
  destinationSafetySubscriptionSchema,
} from '@saraya/contracts';

import { createApiClient } from './index';

const location = {
  kind: 'destination' as const,
  label: 'Cebu City',
  region: 'Central Visayas',
  destinationId: 'cebu-city',
  coordinates: { latitude: 10.3157, longitude: 123.8854 },
};
const conditions = destinationConditionsSchema.parse({
  destination: location,
  weather: {
    location,
    condition: 'Partly cloudy',
    temperatureCelsius: 29,
    relativeHumidityPercent: 75,
    apparentTemperatureCelsius: 32,
    precipitationProbability: 20,
    precipitationMillimeters: 0,
    rainfallMillimeters: 0,
    windSpeedKilometersPerHour: 8,
    windDirectionDegrees: 90,
    warningState: 'no-warning',
    summary: 'Informational Open-Meteo conditions; this is not a government warning.',
    observedAt: '2026-09-28T00:00:00.000Z',
    fetchedAt: '2026-09-28T00:00:00.000Z',
    providerStatus: 'fresh',
    source: { provider: 'open-meteo', name: 'Open-Meteo', isDemo: false },
  },
  safetyAlerts: [],
  fetchedAt: '2026-09-28T00:00:00.000Z',
});
const subscription = destinationSafetySubscriptionSchema.parse({
  destinationId: 'cebu-city',
  subscribed: true,
  createdAt: '2026-09-28T00:00:00.000Z',
});

describe('destination safety API client', () => {
  afterEach(() => jest.restoreAllMocks());

  it('validates conditions and encodes destination IDs', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(conditions));
    await expect(createApiClient('https://api.saraya.test').destinations
      .getConditions('cebu city')).resolves.toEqual(conditions);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://api.saraya.test/destinations/cebu%20city/conditions',
    );
  });

  it('uses authentication for explicit subscription lifecycle operations', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json(subscription, { status: 201 }))
      .mockResolvedValueOnce(Response.json(subscription))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const client = createApiClient('https://api.saraya.test', async () => 'token');
    await expect(client.destinations.subscribeToSafetyAlerts('cebu-city')).resolves.toEqual(subscription);
    await expect(client.destinations.getSafetySubscription('cebu-city')).resolves.toEqual(subscription);
    await expect(client.destinations.unsubscribeFromSafetyAlerts('cebu-city')).resolves.toBeUndefined();
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(Array(3).fill(
      'https://api.saraya.test/destinations/cebu-city/safety-subscription',
    ));
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(expect.objectContaining({
      method: 'POST', headers: expect.objectContaining({ Authorization: 'Bearer token' }),
    }));
    expect(fetchMock.mock.calls[2]?.[1]).toEqual(expect.objectContaining({ method: 'DELETE' }));
  });

  it('rejects malformed server responses', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ destinationId: 'cebu-city' }));
    await expect(createApiClient('https://api.saraya.test').destinations
      .getSafetySubscription('cebu-city')).rejects.toThrow();
  });
});
