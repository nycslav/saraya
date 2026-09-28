import type { SafetyAlert } from '@saraya/contracts';

import { InMemoryDestinationRepository } from '../../src/modules/destinations/destination.repository';
import {
  InMemoryDestinationSafetySubscriptionRepository,
} from '../../src/modules/destination-safety/destination-safety-subscription.repository';
import {
  DestinationSafetyDestinationNotFoundError,
  DestinationSafetyService,
} from '../../src/modules/destination-safety/destination-safety.service';
import { SafetyAlertService } from '../../src/modules/safety-alerts/safety-alert.service';
import { InMemorySafetyAlertRepository } from '../../src/modules/safety-alerts/safety-alert.repository';
import { MockWarningProvider } from '../../src/integrations/warnings';
import { MockWeatherProvider } from '../../src/integrations/weather';

const now = () => new Date('2026-09-28T00:00:00.000Z');

describe('DestinationSafetyService', () => {
  const createService = (notify = jest.fn()) => {
    const subscriptions = new InMemoryDestinationSafetySubscriptionRepository();
    const safety = new SafetyAlertService(
      new InMemorySafetyAlertRepository(), new MockWeatherProvider(), new MockWarningProvider(), now,
    );
    return {
      subscriptions,
      service: new DestinationSafetyService(
        subscriptions,
        new InMemoryDestinationRepository(),
        safety,
        { sendSafetyAlertNotification: notify },
        now,
      ),
    };
  };

  it('aggregates destination weather and relevant alerts without festival coupling', async () => {
    const { service } = createService();
    await expect(service.conditions('cebu-city')).resolves.toEqual(expect.objectContaining({
      destination: expect.objectContaining({ destinationId: 'cebu-city' }),
      weather: expect.objectContaining({ providerStatus: 'fresh' }),
      safetyAlerts: expect.any(Array),
    }));
  });

  it('supports explicit idempotent opt-in, status, and unsubscribe by owner', async () => {
    const { service } = createService();
    const first = await service.subscribe('user-1', 'cebu-city');
    const second = await service.subscribe('user-1', 'cebu-city');
    expect(second.createdAt).toBe(first.createdAt);
    await expect(service.status('user-2', 'cebu-city')).resolves.toMatchObject({ subscribed: false });
    await service.unsubscribe('user-1', 'cebu-city');
    await expect(service.status('user-1', 'cebu-city')).resolves.toMatchObject({ subscribed: false });
  });

  it('rejects subscriptions for unknown destinations', async () => {
    const { service } = createService();
    await expect(service.subscribe('user-1', 'missing')).rejects.toBeInstanceOf(
      DestinationSafetyDestinationNotFoundError,
    );
  });

  it('selects affected subscribers and delegates preference-aware delivery', async () => {
    const notify = jest.fn().mockResolvedValue([]);
    const { service } = createService(notify);
    await service.subscribe('user-1', 'manila-bay');
    await service.subscribe('user-2', 'cebu-city');
    const alert = await new InMemorySafetyAlertRepository().findById('demo-metro-manila-heavy-rain');
    await service.notifySubscribers(alert as SafetyAlert);
    expect(notify).toHaveBeenCalledWith(['user-1'], alert);
  });
});
