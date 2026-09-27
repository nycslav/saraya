import { z } from 'zod';

const optionalString = z.string().min(1).optional();

export const revenueCatWebhookEnvelopeSchema = z.object({
  api_version: z.string().min(1),
  event: z.object({
    id: z.string().min(1),
    type: z.string().min(1),
    event_timestamp_ms: z.number().int().nonnegative(),
    app_user_id: optionalString,
    aliases: z.array(z.string().min(1)).optional().default([]),
    transferred_from: z.array(z.string().min(1)).optional().default([]),
    transferred_to: z.array(z.string().min(1)).optional().default([]),
    product_id: optionalString,
    entitlement_ids: z.array(z.string().min(1)).nullable().optional().transform((value) => value ?? []),
    transaction_id: optionalString,
    original_transaction_id: optionalString,
    purchased_at_ms: z.number().int().nonnegative().optional(),
    expiration_at_ms: z.number().int().nonnegative().nullable().optional(),
    environment: z.enum(['SANDBOX', 'PRODUCTION']).optional(),
    cancel_reason: optionalString,
  }).passthrough(),
}).passthrough();

export type RevenueCatWebhookEvent = z.infer<typeof revenueCatWebhookEnvelopeSchema>['event'];

export type RevenueCatCustomerSnapshot = {
  premiumActive: boolean;
  premiumProductId: string | null;
  premiumOriginalTransactionId: string | null;
  premiumExpiresAt: Date | null;
  topUps: Array<{
    transactionId: string;
    productId: string;
    purchasedAt: Date | null;
  }>;
};
