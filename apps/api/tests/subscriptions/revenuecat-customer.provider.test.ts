import { HttpRevenueCatCustomerProvider } from '../../src/integrations/revenuecat';

describe('HttpRevenueCatCustomerProvider', () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn();
  });

  afterEach(() => jest.restoreAllMocks());

  it('normalizes active lifetime access and consumable transactions', async () => {
    jest.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        subscriber: {
          entitlements: {
            saraya_premium: {
              expires_date: null,
              product_identifier: 'saraya_premium_lifetime',
              purchase_date: '2026-09-01T00:00:00.000Z',
            },
          },
          non_subscriptions: {
            saraya_generations_10: [
              { id: 'top-up-1', purchase_date: '2026-09-02T00:00:00.000Z' },
            ],
          },
        },
      }),
    } as Response);
    const provider = new HttpRevenueCatCustomerProvider(
      'secret-key',
      'saraya_premium',
      'saraya_generations_10',
      'https://revenuecat.test/v1',
    );

    await expect(provider.getCustomer('user/1')).resolves.toMatchObject({
      premiumActive: true,
      premiumProductId: 'saraya_premium_lifetime',
      topUps: [{ transactionId: 'top-up-1' }],
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://revenuecat.test/v1/subscribers/user%2F1',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer secret-key' }) }),
    );
  });
});
