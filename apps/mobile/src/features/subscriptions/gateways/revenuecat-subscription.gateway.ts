import type { PremiumAccess } from '@saraya/contracts';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';

import { revenueCatConfiguration } from '../revenuecat.config';
import { ensureRevenueCatConfigured } from '../services/revenuecat';
import {
  PurchaseCancelledError,
  type PremiumGateway,
  type PremiumProduct,
  type PremiumProductKind,
} from './subscription.gateway';

export function premiumAccess(customerInfo: CustomerInfo): PremiumAccess {
  return customerInfo.entitlements.active[revenueCatConfiguration.entitlementId]
    ? 'premium'
    : 'free';
}

function productKind(subscriptionPackage: PurchasesPackage): PremiumProductKind | undefined {
  if (
    subscriptionPackage.identifier === revenueCatConfiguration.lifetimePackageId ||
    subscriptionPackage.product.identifier === revenueCatConfiguration.lifetimePackageId
  ) return 'lifetime-premium';
  if (
    subscriptionPackage.identifier === revenueCatConfiguration.topUpPackageId ||
    subscriptionPackage.product.identifier === revenueCatConfiguration.topUpPackageId
  ) return 'generation-top-up';
  return undefined;
}

function normalizeProduct(subscriptionPackage: PurchasesPackage): PremiumProduct | undefined {
  const kind = productKind(subscriptionPackage);
  if (!kind) return undefined;
  return {
    id: subscriptionPackage.identifier,
    productId: subscriptionPackage.product.identifier,
    price: subscriptionPackage.product.priceString,
    kind,
  };
}

function isCancellation(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      (('userCancelled' in error && error.userCancelled === true) ||
        ('code' in error && error.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR)),
  );
}

export class RevenueCatPremiumGateway implements PremiumGateway {
  private packages = new Map<string, PurchasesPackage>();

  async getAccess() {
    await ensureRevenueCatConfigured();
    return premiumAccess(await Purchases.getCustomerInfo());
  }

  async getProducts() {
    await ensureRevenueCatConfigured();
    const offerings = await Purchases.getOfferings();
    const offering = offerings.all[revenueCatConfiguration.offeringId] ?? offerings.current;
    const availablePackages = offering?.availablePackages ?? [];
    const supported = availablePackages.filter((subscriptionPackage) => productKind(subscriptionPackage));
    this.packages = new Map(supported.map((subscriptionPackage) => [subscriptionPackage.identifier, subscriptionPackage]));
    return supported.flatMap((subscriptionPackage) => {
      const product = normalizeProduct(subscriptionPackage);
      return product ? [product] : [];
    });
  }

  async purchase(productId: string) {
    await ensureRevenueCatConfigured();
    let subscriptionPackage = this.packages.get(productId);
    if (!subscriptionPackage) {
      await this.getProducts();
      subscriptionPackage = this.packages.get(productId);
    }
    const kind = subscriptionPackage ? productKind(subscriptionPackage) : undefined;
    if (!subscriptionPackage || !kind) throw new Error('The selected purchase is unavailable.');

    try {
      const result = await Purchases.purchasePackage(subscriptionPackage);
      const refreshed = await Purchases.getCustomerInfo();
      return {
        access: premiumAccess(refreshed),
        kind,
        transactionId: result.transaction.transactionIdentifier,
      };
    } catch (error) {
      if (isCancellation(error)) throw new PurchaseCancelledError();
      throw error;
    }
  }

  async restore() {
    await ensureRevenueCatConfigured();
    await Purchases.restorePurchases();
    return premiumAccess(await Purchases.getCustomerInfo());
  }
}

export const premiumGateway: PremiumGateway = new RevenueCatPremiumGateway();
