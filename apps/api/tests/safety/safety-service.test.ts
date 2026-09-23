import { MockWarningProvider } from '../../src/integrations/warnings';
import { MockWeatherProvider, type WeatherProvider } from '../../src/integrations/weather';
import {
  InMemorySafetyAlertRepository,
} from '../../src/modules/safety-alerts/safety-alert.repository';
import { SafetyAlertService, SafetyDestinationNotFoundError } from '../../src/modules/safety-alerts/safety-alert.service';

const now = () => new Date('2026-09-22T12:00:00.000Z');

describe('safety alert repository and service', () => {
  it('filters active alerts by region, severity, and type and excludes expired records', async () => {
    const repository = new InMemorySafetyAlertRepository();
    const location = { kind: 'region', label: 'National Capital Region', region: 'National Capital Region' } as const;
    const results = await repository.findActive(location, { severity: 'yellow', alertType: 'weather' }, now());

    expect(results.map((alert) => alert.id)).toEqual(['demo-metro-manila-heavy-rain']);
    expect(results.some((alert) => alert.id.includes('expired'))).toBe(false);
  });

  it('matches an affected MultiPolygon and supports alert-by-id', async () => {
    const repository = new InMemorySafetyAlertRepository();
    const location = await repository.resolveCoordinates({ latitude: 14.6, longitude: 121 });
    const results = await repository.findActive(location, {}, now());

    expect(results).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'demo-metro-manila-heavy-rain' })]));
    await expect(repository.findById('demo-central-visayas-ferry')).resolves.toEqual(
      expect.objectContaining({ alertType: 'cancellation' }),
    );
  });

  it('orders merged alerts by severity then recency', async () => {
    const service = new SafetyAlertService(
      new InMemorySafetyAlertRepository(), new MockWeatherProvider(), new MockWarningProvider(), now,
    );
    const result = await service.list({ region: 'Bicol Region' });

    expect(result.alerts[0]?.severity).toBe('red');
    expect(result.alerts[1]?.severity).toBe('yellow');
  });

  it('keeps persisted alerts when the provider fails and marks weather unavailable', async () => {
    const service = new SafetyAlertService(
      new InMemorySafetyAlertRepository(), new MockWeatherProvider(true), new MockWarningProvider(true), now,
    );
    const alerts = await service.list({ region: 'Davao Region' });
    const weather = await service.weather({ region: 'Davao Region' });

    expect(alerts.alerts).toEqual([expect.objectContaining({ id: 'demo-davao-health-guidance' })]);
    expect(weather).toEqual(expect.objectContaining({ providerStatus: 'unavailable', warningState: 'unavailable' }));
  });

  it('preserves a provider stale response for a destination lookup', async () => {
    const mock = new MockWeatherProvider();
    const staleProvider: WeatherProvider = {
      source: mock.source,
      async getWeather(location) {
        return { ...await mock.getWeather(location), providerStatus: 'stale' };
      },
    };
    const service = new SafetyAlertService(
      new InMemorySafetyAlertRepository(), staleProvider, new MockWarningProvider(), now,
    );

    await expect(service.weather({ destinationId: 'cebu-city' })).resolves.toEqual(
      expect.objectContaining({
        providerStatus: 'stale',
        location: expect.objectContaining({ destinationId: 'cebu-city' }),
      }),
    );
  });

  it('uses the existing destination catalog and rejects an unknown destination', async () => {
    const service = new SafetyAlertService(
      new InMemorySafetyAlertRepository(), new MockWeatherProvider(), new MockWarningProvider(), now,
    );
    await expect(service.list({ destinationId: 'cebu-city' })).resolves.toEqual(
      expect.objectContaining({ location: expect.objectContaining({ destinationId: 'cebu-city' }) }),
    );
    await expect(service.list({ destinationId: 'missing' })).rejects.toBeInstanceOf(SafetyDestinationNotFoundError);
  });
});
