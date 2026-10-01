export const revenueCatConfiguration = {
  entitlementId: process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID ?? 'saraya_premium',
  offeringId: process.env.EXPO_PUBLIC_REVENUECAT_OFFERING_ID ?? 'default',
  lifetimePackageId:
    process.env.EXPO_PUBLIC_REVENUECAT_LIFETIME_PACKAGE_ID ?? 'saraya_premium_lifetime',
  topUpPackageId:
    process.env.EXPO_PUBLIC_REVENUECAT_TOP_UP_PACKAGE_ID ?? 'saraya_generations_10',
} as const;
