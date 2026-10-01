import { MockPremiumGateway, mockPremiumProducts } from '../gateways/mock-subscription.gateway';
import { PurchaseCancelledError } from '../gateways/subscription.gateway';

describe('premium purchase gateway contract', () => {
  it('provides lifetime Premium and generation top-up products', async () => {
    const products = await new MockPremiumGateway().getProducts();
    expect(products).toEqual(mockPremiumProducts);
    expect(products.map((product) => product.kind)).toEqual([
      'lifetime-premium',
      'generation-top-up',
    ]);
  });

  it('activates lifetime Premium permanently without an expiration state', async () => {
    const gateway = new MockPremiumGateway();
    await expect(gateway.getAccess()).resolves.toBe('free');
    await expect(gateway.purchase('saraya_premium_lifetime')).resolves.toMatchObject({
      access: 'premium',
      kind: 'lifetime-premium',
    });
    await expect(gateway.getAccess()).resolves.toBe('premium');
  });

  it('does not activate Premium when purchasing a top-up', async () => {
    const gateway = new MockPremiumGateway();
    await expect(gateway.purchase('saraya_generations_10')).resolves.toMatchObject({
      access: 'free',
      kind: 'generation-top-up',
    });
    await expect(gateway.getAccess()).resolves.toBe('free');
  });

  it('distinguishes cancellation from purchase failure', async () => {
    const cancelled = new MockPremiumGateway({ cancelNextPurchase: true });
    await expect(cancelled.purchase('saraya_premium_lifetime')).rejects.toBeInstanceOf(PurchaseCancelledError);
    await expect(cancelled.getAccess()).resolves.toBe('free');

    const failed = new MockPremiumGateway({ failNextPurchase: true });
    await expect(failed.purchase('saraya_premium_lifetime')).rejects.toThrow('Store unavailable');
  });

  it('rejects a product outside the configured offering', async () => {
    await expect(new MockPremiumGateway().purchase('missing-product')).rejects.toThrow('unavailable');
  });

  it('restores only a previous lifetime Premium purchase', async () => {
    await expect(new MockPremiumGateway().restore()).resolves.toBe('free');
    await expect(new MockPremiumGateway({ restorable: true }).restore()).resolves.toBe('premium');
  });
});
