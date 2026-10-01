import type { PremiumAccess } from '@saraya/contracts';

export type PremiumProductKind = 'lifetime-premium' | 'generation-top-up';

export type PremiumProduct = {
  id: string;
  productId: string;
  price: string;
  kind: PremiumProductKind;
};

export type PremiumPurchaseResult = {
  access: PremiumAccess;
  kind: PremiumProductKind;
  transactionId: string;
};

export interface PremiumGateway {
  getAccess(): Promise<PremiumAccess>;
  getProducts(): Promise<PremiumProduct[]>;
  purchase(productId: string): Promise<PremiumPurchaseResult>;
  restore(): Promise<PremiumAccess>;
}

export class PurchaseCancelledError extends Error {
  constructor() {
    super('Purchase cancelled.');
    this.name = 'PurchaseCancelledError';
  }
}

export class PurchaseConfigurationError extends Error {
  constructor(message = 'Premium purchases are not configured for this build.') {
    super(message);
    this.name = 'PurchaseConfigurationError';
  }
}
