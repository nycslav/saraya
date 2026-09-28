import { z } from 'zod';

import type { RevenueCatCustomerSnapshot } from './revenuecat.types';

const entitlementSchema = z.object({
  expires_date: z.string().datetime().nullable(),
  product_identifier: z.string().min(1),
  purchase_date: z.string().datetime(),
});

const purchaseSchema = z.object({
  id: z.string().min(1),
  purchase_date: z.string().datetime().nullable().optional(),
});

const customerResponseSchema = z.object({
  subscriber: z.object({
    entitlements: z.record(z.string(), entitlementSchema),
    non_subscriptions: z.record(z.string(), z.array(purchaseSchema)),
  }),
});

export interface RevenueCatCustomerProvider {
  getCustomer(customerId: string): Promise<RevenueCatCustomerSnapshot>;
}

export class RevenueCatCustomerConfigurationError extends Error {}

export class HttpRevenueCatCustomerProvider implements RevenueCatCustomerProvider {
  constructor(
    private readonly apiKey = process.env.REVENUECAT_SECRET_API_KEY,
    private readonly entitlementId =
      process.env.REVENUECAT_ENTITLEMENT_ID ?? 'saraya_premium',
    private readonly topUpProductId =
      process.env.REVENUECAT_TOP_UP_PRODUCT_ID ?? 'saraya_generations_10',
    private readonly baseUrl = process.env.REVENUECAT_API_BASE_URL ?? 'https://api.revenuecat.com/v1',
    private readonly now: () => Date = () => new Date(),
  ) {}

  async getCustomer(customerId: string): Promise<RevenueCatCustomerSnapshot> {
    if (!this.apiKey) {
      throw new RevenueCatCustomerConfigurationError(
        'RevenueCat server API access is not configured.',
      );
    }
    const response = await fetch(
      `${this.baseUrl.replace(/\/$/, '')}/subscribers/${encodeURIComponent(customerId)}`,
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
      },
    );
    if (!response.ok) throw new Error(`RevenueCat customer lookup failed with status ${response.status}.`);

    const body = customerResponseSchema.parse(await response.json());
    const entitlement = body.subscriber.entitlements[this.entitlementId];
    const expiration = entitlement?.expires_date ? new Date(entitlement.expires_date) : null;
    const premiumActive = Boolean(
      entitlement && (!expiration || expiration.getTime() > this.now().getTime()),
    );
    return {
      premiumActive,
      premiumProductId: entitlement?.product_identifier ?? null,
      premiumOriginalTransactionId: null,
      premiumExpiresAt: expiration,
      topUps: (body.subscriber.non_subscriptions[this.topUpProductId] ?? []).map((purchase) => ({
        transactionId: purchase.id,
        productId: this.topUpProductId,
        purchasedAt: purchase.purchase_date ? new Date(purchase.purchase_date) : null,
      })),
    };
  }
}
