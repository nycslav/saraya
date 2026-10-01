import {
  GenerationQuotaExhaustedError,
  InMemorySubscriptionRepository,
  subscriptionConfiguration,
} from '../../src/modules/subscriptions/subscription.repository';

const now = new Date('2026-09-15T12:00:00.000Z');

function event(overrides: Record<string, unknown> = {}) {
  return {
    id: `event-${Math.random()}`,
    type: 'NON_RENEWING_PURCHASE',
    event_timestamp_ms: now.getTime(),
    app_user_id: 'rc-user-1',
    aliases: [],
    transferred_from: [],
    transferred_to: [],
    product_id: subscriptionConfiguration.lifetimeProductId,
    entitlement_ids: [subscriptionConfiguration.entitlementId],
    transaction_id: 'lifetime-transaction',
    original_transaction_id: 'lifetime-transaction',
    environment: 'SANDBOX' as const,
    ...overrides,
  };
}

describe('InMemorySubscriptionRepository', () => {
  it('allows only three concurrent Free reservations and isolates users', async () => {
    const repository = new InMemorySubscriptionRepository();
    const attempts = await Promise.allSettled(
      ['one', 'two', 'three', 'four'].map((id) =>
        repository.reserveGeneration('free-user', id, now),
      ),
    );

    expect(attempts.filter(({ status }) => status === 'fulfilled')).toHaveLength(3);
    expect(attempts.find(({ status }) => status === 'rejected')).toMatchObject({
      reason: expect.any(GenerationQuotaExhaustedError),
    });
    await expect(repository.getState('different-user', now)).resolves.toMatchObject({
      quota: { includedRemaining: 3 },
    });
  });

  it('consumes only committed generations and releases failed reservations', async () => {
    const repository = new InMemorySubscriptionRepository();
    await repository.reserveGeneration('user-1', 'failed', now);
    await repository.releaseReservation('failed', now);
    expect((await repository.getState('user-1', now)).quota.includedRemaining).toBe(3);

    const reservation = await repository.reserveGeneration('user-1', 'success', now);
    const consumption = await repository.consumeReservation(reservation.id, now);
    expect(consumption.source).toBe('included');
    expect(consumption.quota.includedRemaining).toBe(2);
  });

  it('activates and expires Premium without allowing stale events to override newer state', async () => {
    const repository = new InMemorySubscriptionRepository();
    await repository.associateCustomer('user-1', 'rc-user-1');
    await repository.processWebhook(event(), subscriptionConfiguration);
    expect(await repository.getState('user-1', now)).toMatchObject({
      access: 'premium',
      quota: { includedRemaining: 10, canRegenerate: true },
    });

    await repository.processWebhook(
      event({ id: 'expiration', type: 'EXPIRATION', event_timestamp_ms: now.getTime() + 2000 }),
      subscriptionConfiguration,
    );
    await repository.processWebhook(
      event({ id: 'stale-renewal', type: 'RENEWAL', event_timestamp_ms: now.getTime() + 1000 }),
      subscriptionConfiguration,
    );
    expect((await repository.getState('user-1', new Date(now.getTime() + 3000))).access).toBe('free');
  });

  it('deduplicates webhook events and top-up transactions', async () => {
    const repository = new InMemorySubscriptionRepository();
    await repository.associateCustomer('user-1', 'rc-user-1');
    const topUp = event({
      id: 'top-up-event',
      product_id: subscriptionConfiguration.topUpProductId,
      entitlement_ids: [],
      transaction_id: 'top-up-transaction',
    });
    await expect(repository.processWebhook(topUp, subscriptionConfiguration)).resolves.toBe('processed');
    await expect(repository.processWebhook(topUp, subscriptionConfiguration)).resolves.toBe('duplicate');
    await repository.processWebhook(
      { ...topUp, id: 'redelivered-as-new-event' },
      subscriptionConfiguration,
    );
    expect((await repository.getState('user-1', now)).quota.topUpRemaining).toBe(10);
  });

  it('reverses an unused top-up once and prevents synchronization from re-crediting it', async () => {
    const repository = new InMemorySubscriptionRepository();
    await repository.associateCustomer('user-1', 'rc-user-1');
    const topUp = event({
      id: 'top-up-purchase',
      product_id: subscriptionConfiguration.topUpProductId,
      entitlement_ids: [],
      transaction_id: 'top-up-refunded',
      original_transaction_id: 'top-up-refunded',
    });
    await repository.processWebhook(topUp, subscriptionConfiguration);
    const cancellation = {
      ...topUp,
      id: 'top-up-cancellation',
      type: 'CANCELLATION',
      transaction_id: undefined,
    };

    await expect(repository.processWebhook(cancellation, subscriptionConfiguration))
      .resolves.toBe('processed');
    await expect(repository.processWebhook(
      { ...cancellation, id: 'duplicate-cancellation' },
      subscriptionConfiguration,
    )).resolves.toBe('processed');
    expect((await repository.getState('user-1', now)).quota.topUpRemaining).toBe(0);

    await repository.synchronizeCustomer('user-1', 'rc-user-1', {
      premiumActive: false,
      premiumProductId: null,
      premiumOriginalTransactionId: null,
      premiumExpiresAt: null,
      topUps: [{
        transactionId: 'top-up-refunded',
        productId: subscriptionConfiguration.topUpProductId,
        purchasedAt: now,
      }],
    }, now);
    expect((await repository.getState('user-1', now)).quota.topUpRemaining).toBe(0);
  });

  it('refunds only the unused portion of a partially or fully consumed top-up', async () => {
    const partial = new InMemorySubscriptionRepository();
    await partial.associateCustomer('user-1', 'rc-user-1');
    await partial.processWebhook(event({
      id: 'partial-purchase',
      product_id: subscriptionConfiguration.topUpProductId,
      entitlement_ids: [],
      transaction_id: 'partial-transaction',
    }), subscriptionConfiguration);
    for (let index = 0; index < 7; index += 1) {
      const reservation = await partial.reserveGeneration('user-1', `partial-${index}`, now);
      await partial.consumeReservation(reservation.id, now);
    }
    expect((await partial.getState('user-1', now)).quota.topUpRemaining).toBe(6);
    await partial.processWebhook(event({
      id: 'partial-refund',
      type: 'CANCELLATION',
      product_id: subscriptionConfiguration.topUpProductId,
      entitlement_ids: [],
      transaction_id: 'partial-transaction',
    }), subscriptionConfiguration);
    expect((await partial.getState('user-1', now)).quota.topUpRemaining).toBe(0);

    const consumed = new InMemorySubscriptionRepository();
    await consumed.associateCustomer('user-1', 'rc-user-1');
    await consumed.processWebhook(event({
      id: 'consumed-purchase',
      product_id: subscriptionConfiguration.topUpProductId,
      entitlement_ids: [],
      transaction_id: 'consumed-transaction',
    }), subscriptionConfiguration);
    for (let index = 0; index < 13; index += 1) {
      const reservation = await consumed.reserveGeneration('user-1', `consumed-${index}`, now);
      await consumed.consumeReservation(reservation.id, now);
    }
    await consumed.processWebhook(event({
      id: 'consumed-refund',
      type: 'CANCELLATION',
      product_id: subscriptionConfiguration.topUpProductId,
      entitlement_ids: [],
      transaction_id: 'consumed-transaction',
    }), subscriptionConfiguration);
    expect((await consumed.getState('user-1', now)).quota.topUpRemaining).toBe(0);
  });

  it('uses included Premium allowance before persistent purchased credits and resets monthly', async () => {
    const repository = new InMemorySubscriptionRepository();
    await repository.associateCustomer('user-1', 'rc-user-1');
    await repository.processWebhook(event(), subscriptionConfiguration);
    await repository.processWebhook(
      event({
        id: 'top-up',
        product_id: subscriptionConfiguration.topUpProductId,
        entitlement_ids: [],
        transaction_id: 'top-up-1',
      }),
      subscriptionConfiguration,
    );
    for (let index = 0; index < 10; index += 1) {
      const reservation = await repository.reserveGeneration('user-1', `included-${index}`, now);
      expect(reservation.source).toBe('included');
      await repository.consumeReservation(reservation.id, now);
    }
    const purchased = await repository.reserveGeneration('user-1', 'purchased', now);
    expect(purchased.source).toBe('top-up');
    await repository.consumeReservation(purchased.id, now);
    expect((await repository.getState('user-1', now)).quota.topUpRemaining).toBe(9);

    const october = new Date('2026-10-01T00:00:00.000Z');
    expect(await repository.getState('user-1', october)).toMatchObject({
      quota: { includedRemaining: 10, topUpRemaining: 9 },
    });
  });

  it('keeps unknown customers pending and moves an entitlement during a transfer', async () => {
    const repository = new InMemorySubscriptionRepository();
    await expect(repository.processWebhook(event(), subscriptionConfiguration)).resolves.toBe(
      'pending-association',
    );
    await repository.associateCustomer('source-user', 'rc-user-1');
    await repository.synchronizeCustomer(
      'source-user',
      'rc-user-1',
      {
        premiumActive: true,
        premiumProductId: subscriptionConfiguration.lifetimeProductId,
        premiumOriginalTransactionId: 'lifetime-transaction',
        premiumExpiresAt: null,
        topUps: [],
      },
      now,
    );
    expect((await repository.getState('source-user', now)).access).toBe('premium');
    await repository.associateCustomer('destination-user', 'rc-user-2');
    await repository.processWebhook(
      event({
        id: 'transfer',
        type: 'TRANSFER',
        app_user_id: undefined,
        transferred_from: ['rc-user-1'],
        transferred_to: ['rc-user-2'],
      }),
      subscriptionConfiguration,
    );
    expect((await repository.getState('source-user', now)).access).toBe('free');
    expect((await repository.getState('destination-user', now)).access).toBe('premium');
  });
});
