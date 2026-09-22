import { ApiSafetyAlertGateway, FixtureSafetyAlertGateway } from '../gateways';

describe('safety alert gateways', () => {
  const originalUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  afterEach(() => {
    jest.restoreAllMocks();
    process.env.EXPO_PUBLIC_API_BASE_URL = originalUrl;
  });

  it('keeps the fixture gateway deterministic and returns demo metadata', async () => {
    const gateway = new FixtureSafetyAlertGateway();
    const first = await gateway.list({ region: 'National Capital Region' });
    const second = await gateway.list({ region: 'National Capital Region' });

    expect(first).toEqual(second);
    expect(first.alerts[0]).toEqual(expect.objectContaining({ source: expect.objectContaining({ isDemo: true }) }));
    await expect(gateway.getWeather({ region: 'National Capital Region' })).resolves.toEqual(
      expect.objectContaining({ source: expect.objectContaining({ isDemo: true }) }),
    );
  });

  it('supports deterministic fixture failure', async () => {
    const gateway = new FixtureSafetyAlertGateway(true);
    await expect(gateway.list({ region: 'Bicol Region' })).rejects.toThrow('Safety demo unavailable');
    await expect(gateway.getWeather({ region: 'Bicol Region' })).rejects.toThrow('Weather demo unavailable');
  });

  it('uses the typed API client and propagates API failures', async () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://example.test';
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
      location: { kind: 'region', label: 'Ilocos Region', region: 'Ilocos Region' }, alerts: [],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const gateway = new ApiSafetyAlertGateway();

    await expect(gateway.list({ region: 'Ilocos Region' })).resolves.toEqual(expect.objectContaining({ alerts: [] }));
    expect(fetchMock).toHaveBeenCalledWith('https://example.test/safety-alerts?region=Ilocos+Region', expect.any(Object));

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'offline' } }), {
      status: 503, headers: { 'Content-Type': 'application/json' },
    }));
    await expect(gateway.list({ region: 'Ilocos Region' })).rejects.toThrow('offline');
  });
});
