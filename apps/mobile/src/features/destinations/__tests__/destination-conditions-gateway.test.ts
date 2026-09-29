import { sessionStore } from '@/features/auth/sessionStore';

import { ApiDestinationConditionsGateway } from '../gateways';

jest.mock('@/features/auth/sessionStore', () => ({
  sessionStore: { read: jest.fn() },
}));

const mockRead = sessionStore.read as jest.Mock;
const location = {
  kind: 'destination' as const,
  label: 'Cebu City',
  region: 'Central Visayas',
  destinationId: 'cebu-city',
  coordinates: { latitude: 10.3157, longitude: 123.8854 },
};
const conditions = {
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
    warningState: 'unavailable' as const,
    summary: 'Weather data is unavailable. Saraya has not assumed that conditions are safe.',
    observedAt: null,
    fetchedAt: '2026-09-28T00:00:00.000Z',
    providerStatus: 'unavailable' as const,
    source: { provider: 'open-meteo', name: 'Open-Meteo', isDemo: false },
  },
  safetyAlerts: [],
  warningProviderStatus: {
    status: 'unavailable' as const, lastCheckedAt: null, lastSucceededAt: null,
  },
  fetchedAt: '2026-09-28T00:00:00.000Z',
};

describe('destination conditions gateway', () => {
  const originalUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.saraya.test';
    mockRead.mockResolvedValue({ accessToken: 'token', refreshToken: 'refresh' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env.EXPO_PUBLIC_API_BASE_URL = originalUrl;
  });

  it('preserves unavailable weather and empty alerts for destination UI', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(conditions));
    await expect(new ApiDestinationConditionsGateway().getConditions('cebu-city'))
      .resolves.toEqual(conditions);
  });

  it('uses the authenticated client for explicit opt-in and unsubscribe', async () => {
    const subscription = {
      destinationId: 'cebu-city', subscribed: true,
      createdAt: '2026-09-28T00:00:00.000Z',
    };
    const fetchMock = jest.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json(subscription, { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const gateway = new ApiDestinationConditionsGateway();
    await expect(gateway.subscribeToSafetyAlerts('cebu-city')).resolves.toEqual(subscription);
    await expect(gateway.unsubscribeFromSafetyAlerts('cebu-city')).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer token' }),
    }));
  });

  it('propagates API errors for the consuming screen error state', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ error: { message: 'Conditions unavailable.' } }, { status: 503 }),
    );
    await expect(new ApiDestinationConditionsGateway().getConditions('cebu-city'))
      .rejects.toThrow('Conditions unavailable.');
  });
});
