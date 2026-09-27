import type { RevenueCatCustomerProvider } from '../../src/integrations/revenuecat';
import { InMemorySubscriptionRepository } from '../../src/modules/subscriptions/subscription.repository';
import { SubscriptionService } from '../../src/modules/subscriptions/subscription.service';

describe('SubscriptionService', () => {
  it('synchronizes authoritative customer state and top-ups from RevenueCat', async () => {
    const repository = new InMemorySubscriptionRepository();
    const provider: RevenueCatCustomerProvider = {
      getCustomer: jest.fn().mockResolvedValue({
        premiumActive: true,
        premiumProductId: 'saraya_premium_lifetime',
        premiumOriginalTransactionId: 'lifetime-1',
        premiumExpiresAt: null,
        topUps: [{ transactionId: 'top-up-1', productId: 'saraya_generations_10', purchasedAt: null }],
      }),
    };
    const service = new SubscriptionService(
      repository,
      provider,
      () => new Date('2026-09-15T00:00:00.000Z'),
    );

    await expect(service.synchronize('user-1')).resolves.toMatchObject({
      access: 'premium',
      quota: { includedRemaining: 10, topUpRemaining: 10 },
    });
    await service.synchronize('user-1');
    expect((await service.getState('user-1')).quota.topUpRemaining).toBe(10);
  });

  it('releases quota when generation fails or is cancelled and consumes it after success', async () => {
    const repository = new InMemorySubscriptionRepository();
    const provider = { getCustomer: jest.fn() } as RevenueCatCustomerProvider;
    const service = new SubscriptionService(repository, provider, () => new Date('2026-09-15T00:00:00.000Z'));

    await expect(
      service.withGenerationReservation('user-1', async () => { throw new Error('provider failed'); }),
    ).rejects.toThrow('provider failed');
    expect((await service.getState('user-1')).quota.includedRemaining).toBe(3);

    await service.withGenerationReservation('user-1', async () => 'itinerary');
    expect((await service.getState('user-1')).quota.includedRemaining).toBe(2);

    await expect(
      service.withGenerationReservation('user-1', async () => 'cancelled', () => true),
    ).rejects.toThrow('cancelled');
    expect((await service.getState('user-1')).quota.includedRemaining).toBe(2);
  });
});
