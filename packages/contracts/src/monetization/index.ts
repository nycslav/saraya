import { z } from 'zod';

export const premiumAccessSchema = z.enum(['free', 'premium']);
export const generationCreditSourceSchema = z.enum(['included', 'top-up']);

export const generationQuotaSchema = z.object({
  access: premiumAccessSchema,
  includedLimit: z.number().int().nonnegative(),
  includedRemaining: z.number().int().nonnegative(),
  topUpRemaining: z.number().int().nonnegative(),
  canGenerate: z.boolean(),
  canRegenerate: z.boolean(),
  periodStart: z.string().datetime().nullable(),
  periodEnd: z.string().datetime().nullable(),
});

export const generationConsumptionSchema = z.object({
  source: generationCreditSourceSchema,
  quota: generationQuotaSchema,
});

export const subscriptionStateSchema = z.object({
  access: premiumAccessSchema,
  quota: generationQuotaSchema,
});

export const revenueCatWebhookResultSchema = z.object({
  status: z.enum(['processed', 'duplicate', 'pending-association', 'ignored']),
});

export type PremiumAccess = z.infer<typeof premiumAccessSchema>;
export type GenerationCreditSource = z.infer<typeof generationCreditSourceSchema>;
export type GenerationQuota = z.infer<typeof generationQuotaSchema>;
export type GenerationConsumption = z.infer<typeof generationConsumptionSchema>;
export type SubscriptionState = z.infer<typeof subscriptionStateSchema>;
export type RevenueCatWebhookResult = z.infer<typeof revenueCatWebhookResultSchema>;
