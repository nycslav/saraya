import type { PremiumAccess } from '@saraya/contracts';

import {
  PurchaseCancelledError,
  type PremiumGateway,
  type PremiumProduct,
} from './subscription.gateway';

export const mockPremiumProducts: PremiumProduct[] = [
  {
    id: 'saraya_premium_lifetime',
    productId: 'saraya_premium_lifetime',
    price: '$39.99',
    kind: 'lifetime-premium',
  },
  {
    id: 'saraya_generations_10',
    productId: 'saraya_generations_10',
    price: '$5.00',
    kind: 'generation-top-up',
  },
];

type MockPremiumOptions = {
  access?: PremiumAccess;
  products?: PremiumProduct[];
  restorable?: boolean;
  cancelNextPurchase?: boolean;
  failNextPurchase?: boolean;
};

export class MockPremiumGateway implements PremiumGateway {
  private access: PremiumAccess;
  private readonly products: PremiumProduct[];
  private readonly restorable: boolean;
  private cancelNextPurchase: boolean;
  private failNextPurchase: boolean;
  private transaction = 0;

  constructor(options: MockPremiumOptions = {}) {
    this.access = options.access ?? 'free';
    this.products = options.products ?? mockPremiumProducts;
    this.restorable = options.restorable ?? false;
    this.cancelNextPurchase = options.cancelNextPurchase ?? false;
    this.failNextPurchase = options.failNextPurchase ?? false;
  }

  async getAccess() {
    return this.access;
  }

  async getProducts() {
    return this.products;
  }

  async purchase(productId: string) {
    const product = this.products.find((candidate) => candidate.id === productId);
    if (!product) throw new Error('The selected purchase is unavailable.');
    if (this.cancelNextPurchase) {
      this.cancelNextPurchase = false;
      throw new PurchaseCancelledError();
    }
    if (this.failNextPurchase) {
      this.failNextPurchase = false;
      throw new Error('Store unavailable.');
    }
    if (product.kind === 'lifetime-premium') this.access = 'premium';
    this.transaction += 1;
    return {
      access: this.access,
      kind: product.kind,
      transactionId: `mock-transaction-${this.transaction}`,
    };
  }

  async restore() {
    if (this.restorable) this.access = 'premium';
    return this.access;
  }
}
