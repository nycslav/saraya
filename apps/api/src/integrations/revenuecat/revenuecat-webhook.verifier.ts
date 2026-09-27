import { createHmac, timingSafeEqual } from 'node:crypto';

export class RevenueCatWebhookConfigurationError extends Error {}
export class RevenueCatWebhookAuthenticationError extends Error {}

export type RevenueCatWebhookVerificationInput = {
  authorization?: string;
  signature?: string;
  rawBody: Buffer;
};

export class RevenueCatWebhookVerifier {
  constructor(
    private readonly authorization =
      process.env.REVENUECAT_WEBHOOK_AUTHORIZATION ?? process.env.REVENUECAT_WEBHOOK_SECRET,
    private readonly signingSecret = process.env.REVENUECAT_WEBHOOK_SIGNING_SECRET,
    private readonly nowSeconds: () => number = () => Math.floor(Date.now() / 1000),
    private readonly toleranceSeconds = 300,
  ) {}

  verify(input: RevenueCatWebhookVerificationInput) {
    if (!this.authorization && !this.signingSecret) {
      throw new RevenueCatWebhookConfigurationError(
        'RevenueCat webhook authentication is not configured.',
      );
    }

    if (this.authorization && !safeEqual(input.authorization, this.authorization)) {
      throw new RevenueCatWebhookAuthenticationError('RevenueCat webhook authorization failed.');
    }

    if (this.signingSecret) {
      this.verifySignature(input.rawBody, input.signature);
    }
  }

  private verifySignature(rawBody: Buffer, header?: string) {
    const parts = Object.fromEntries(
      (header ?? '').split(',').flatMap((part) => {
        const separator = part.indexOf('=');
        return separator > 0 ? [[part.slice(0, separator), part.slice(separator + 1)]] : [];
      }),
    );
    const timestamp = parts.t;
    const signature = parts.v1;
    if (!timestamp || !signature || !/^\d+$/.test(timestamp)) {
      throw new RevenueCatWebhookAuthenticationError('RevenueCat webhook signature is invalid.');
    }

    const parsedTimestamp = Number(timestamp);
    if (Math.abs(this.nowSeconds() - parsedTimestamp) > this.toleranceSeconds) {
      throw new RevenueCatWebhookAuthenticationError('RevenueCat webhook signature has expired.');
    }

    const expected = createHmac('sha256', this.signingSecret!)
      .update(`${timestamp}.`)
      .update(rawBody)
      .digest('hex');
    if (!safeEqual(signature, expected)) {
      throw new RevenueCatWebhookAuthenticationError('RevenueCat webhook signature is invalid.');
    }
  }
}

function safeEqual(actual: string | undefined, expected: string) {
  if (!actual) return false;
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
