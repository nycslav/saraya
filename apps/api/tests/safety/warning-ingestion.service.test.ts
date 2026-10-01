import type { SafetyAlert, SafetySource } from '@saraya/contracts';

import { WarningProviderUnavailableError, type WarningProvider } from '../../src/integrations/warnings';
import { InMemorySafetyAlertRepository } from '../../src/modules/safety-alerts/safety-alert.repository';
import { seedSafetyAlerts } from '../../src/modules/safety-alerts/safety-alert.seed';
import { WarningIngestionService } from '../../src/modules/safety-alerts/warning-ingestion.service';

const now = () => new Date('2026-09-29T02:00:00.000Z');
const source: SafetySource = {
  provider: 'pagasa-cap', name: 'DOST-PAGASA CAP feed',
  url: 'https://publicalert.pagasa.dost.gov.ph/feeds/', isDemo: false,
};
const liveAlert: SafetyAlert = {
  ...seedSafetyAlerts[0]!,
  id: 'pagasa-cap:warning-1',
  title: 'Official warning',
  startsAt: '2026-09-29T01:00:00.000Z',
  endsAt: '2026-09-29T05:00:00.000Z',
  source,
  createdAt: '2026-09-29T01:00:00.000Z',
  updatedAt: '2026-09-29T01:00:00.000Z',
};

class TestProvider implements WarningProvider {
  readonly source = source;
  constructor(public alerts: SafetyAlert[] = [liveAlert], private readonly failure = false) {}
  async getActiveWarnings() {
    if (this.failure) throw new WarningProviderUnavailableError();
    return this.alerts;
  }
}

describe('WarningIngestionService', () => {
  it('upserts once, avoids repeat notifications, and records a fresh provider state', async () => {
    const repository = new InMemorySafetyAlertRepository([]);
    const notifier = { notifySubscribers: jest.fn().mockResolvedValue([]) };
    const service = new WarningIngestionService(new TestProvider(), repository, notifier, now);

    await expect(service.ingest()).resolves.toMatchObject({ changed: 1, notificationsAttempted: 1 });
    await expect(service.ingest()).resolves.toMatchObject({ changed: 0, notificationsAttempted: 0 });
    expect(notifier.notifySubscribers).toHaveBeenCalledTimes(1);
    await expect(repository.getWarningProviderStatus('pagasa-cap')).resolves.toMatchObject({ status: 'fresh' });
  });

  it('expires alerts missing from a successful authoritative poll', async () => {
    const repository = new InMemorySafetyAlertRepository([]);
    const provider = new TestProvider();
    const service = new WarningIngestionService(
      provider, repository, { notifySubscribers: jest.fn().mockResolvedValue([]) }, now,
    );
    await service.ingest();
    provider.alerts = [];

    await expect(service.ingest()).resolves.toMatchObject({ expired: 1 });
    await expect(repository.findActive(
      { kind: 'region', label: liveAlert.affectedRegions[0]!, region: liveAlert.affectedRegions[0]! },
      {}, now(),
    )).resolves.toEqual([]);
  });

  it('records provider failure without deleting an existing valid warning', async () => {
    const repository = new InMemorySafetyAlertRepository([liveAlert]);
    const service = new WarningIngestionService(
      new TestProvider([], true), repository, { notifySubscribers: jest.fn() }, now,
    );
    await expect(service.ingest()).rejects.toBeInstanceOf(WarningProviderUnavailableError);
    await expect(repository.findById(liveAlert.id)).resolves.toEqual(liveAlert);
    await expect(repository.getWarningProviderStatus('pagasa-cap')).resolves.toMatchObject({ status: 'unavailable' });
  });

  it('never persists or notifies from a demo provider', async () => {
    const provider: WarningProvider = {
      source: { provider: 'demo', name: 'Demo', isDemo: true },
      getActiveWarnings: jest.fn().mockResolvedValue([{ ...liveAlert, source: { provider: 'demo', name: 'Demo', isDemo: true } }]),
    };
    const repository = new InMemorySafetyAlertRepository([]);
    const notifier = { notifySubscribers: jest.fn() };
    await expect(new WarningIngestionService(provider, repository, notifier, now).ingest())
      .resolves.toMatchObject({ demoSkipped: true, changed: 0 });
    expect(provider.getActiveWarnings).not.toHaveBeenCalled();
    expect(notifier.notifySubscribers).not.toHaveBeenCalled();
  });

  it('isolates notification delivery failure from successful provider ingestion', async () => {
    const repository = new InMemorySafetyAlertRepository([]);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const service = new WarningIngestionService(
      new TestProvider(),
      repository,
      { notifySubscribers: jest.fn().mockRejectedValue(new Error('push unavailable')) },
      now,
    );

    await expect(service.ingest()).resolves.toMatchObject({
      changed: 1, notificationsAttempted: 1, notificationFailures: 1,
    });
    await expect(repository.getWarningProviderStatus('pagasa-cap')).resolves.toMatchObject({ status: 'fresh' });
    consoleSpy.mockRestore();
  });
});
