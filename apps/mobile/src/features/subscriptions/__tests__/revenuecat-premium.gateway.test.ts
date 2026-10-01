import { PurchaseCancelledError } from '../gateways/subscription.gateway';
import { RevenueCatPremiumGateway } from '../gateways/revenuecat-subscription.gateway';

const mockIsConfigured = jest.fn();
const mockGetCustomerInfo = jest.fn();
const mockGetOfferings = jest.fn();
const mockPurchasePackage = jest.fn();
const mockRestorePurchases = jest.fn();

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    PURCHASES_ERROR_CODE: { PURCHASE_CANCELLED_ERROR: 'PURCHASE_CANCELLED_ERROR' },
    configure: jest.fn(),
    setLogLevel: jest.fn(),
    isConfigured: (...args: unknown[]) => mockIsConfigured(...args),
    getCustomerInfo: (...args: unknown[]) => mockGetCustomerInfo(...args),
    getOfferings: (...args: unknown[]) => mockGetOfferings(...args),
    purchasePackage: (...args: unknown[]) => mockPurchasePackage(...args),
    restorePurchases: (...args: unknown[]) => mockRestorePurchases(...args),
  },
  LOG_LEVEL: { DEBUG: 'DEBUG' },
}));

jest.mock('../services/revenuecat', () => ({
  ensureRevenueCatConfigured: () => Promise.resolve(),
}));

const freeCustomer = { entitlements: { active: {}, all: {} } };
const premiumCustomer = {
  entitlements: {
    active: { saraya_premium: { identifier: 'saraya_premium' } },
    all: { saraya_premium: { identifier: 'saraya_premium' } },
  },
};
const lifetimePackage = {
  identifier: 'saraya_premium_lifetime',
  product: { identifier: 'saraya_premium_lifetime', priceString: '₱1,990.00' },
};
const topUpPackage = {
  identifier: 'saraya_generations_10',
  product: { identifier: 'saraya_generations_10', priceString: '₱299.00' },
};
const unrelatedPackage = {
  identifier: 'unrelated',
  product: { identifier: 'unrelated', priceString: '₱1.00' },
};

describe('RevenueCat Premium adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConfigured.mockResolvedValue(true);
    mockGetCustomerInfo.mockResolvedValue(freeCustomer);
    mockGetOfferings.mockResolvedValue({
      current: null,
      all: {
        default: { availablePackages: [lifetimePackage, topUpPackage, unrelatedPackage] },
      },
    });
    mockRestorePurchases.mockResolvedValue(freeCustomer);
  });

  it('loads only the configured products and preserves localized store prices', async () => {
    const gateway = new RevenueCatPremiumGateway();
    await expect(gateway.getProducts()).resolves.toEqual([
      {
        id: 'saraya_premium_lifetime',
        productId: 'saraya_premium_lifetime',
        price: '₱1,990.00',
        kind: 'lifetime-premium',
      },
      {
        id: 'saraya_generations_10',
        productId: 'saraya_generations_10',
        price: '₱299.00',
        kind: 'generation-top-up',
      },
    ]);
  });

  it('refreshes customer state after lifetime purchase and returns the transaction ID', async () => {
    mockPurchasePackage.mockResolvedValueOnce({
      customerInfo: premiumCustomer,
      transaction: { transactionIdentifier: 'lifetime-transaction' },
    });
    mockGetCustomerInfo.mockResolvedValueOnce(premiumCustomer);
    const gateway = new RevenueCatPremiumGateway();

    await expect(gateway.purchase('saraya_premium_lifetime')).resolves.toEqual({
      access: 'premium',
      kind: 'lifetime-premium',
      transactionId: 'lifetime-transaction',
    });
    expect(mockGetCustomerInfo).toHaveBeenCalled();
  });

  it('returns a consumable transaction without granting Premium', async () => {
    mockPurchasePackage.mockResolvedValueOnce({
      customerInfo: freeCustomer,
      transaction: { transactionIdentifier: 'top-up-transaction' },
    });
    const gateway = new RevenueCatPremiumGateway();

    await expect(gateway.purchase('saraya_generations_10')).resolves.toEqual({
      access: 'free',
      kind: 'generation-top-up',
      transactionId: 'top-up-transaction',
    });
  });

  it('translates RevenueCat cancellation into the provider-neutral cancellation error', async () => {
    mockPurchasePackage.mockRejectedValueOnce({ code: 'PURCHASE_CANCELLED_ERROR' });
    const gateway = new RevenueCatPremiumGateway();
    await expect(gateway.purchase('saraya_premium_lifetime')).rejects.toBeInstanceOf(PurchaseCancelledError);
  });

  it('restores and refreshes lifetime Premium ownership', async () => {
    mockRestorePurchases.mockResolvedValueOnce(premiumCustomer);
    mockGetCustomerInfo.mockResolvedValueOnce(premiumCustomer);
    await expect(new RevenueCatPremiumGateway().restore()).resolves.toBe('premium');
  });
});
