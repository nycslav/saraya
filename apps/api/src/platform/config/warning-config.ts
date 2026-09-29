import { z } from 'zod';

import './load-env';

const DEFAULT_PAGASA_CAP_FEED_URL = 'https://publicalert.pagasa.dost.gov.ph/feeds/';

const schema = z.object({
  WARNING_PROVIDER: z.enum(['pagasa_cap', 'demo', 'unavailable']),
  PAGASA_CAP_FEED_URL: z.string().url().refine((value) => {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'publicalert.pagasa.dost.gov.ph';
  }, 'PAGASA_CAP_FEED_URL must use the official PAGASA HTTPS host.'),
  WARNING_PROVIDER_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(60_000),
});

export interface WarningConfiguration {
  provider: 'pagasa_cap' | 'demo' | 'unavailable';
  pagasaCapFeedUrl: string;
  timeoutMs: number;
}

export function readWarningConfiguration(
  environment: Record<string, string | undefined> = process.env,
): WarningConfiguration {
  const defaultProvider = environment.NODE_ENV === 'test' ? 'demo' : 'pagasa_cap';
  const parsed = schema.parse({
    WARNING_PROVIDER: environment.WARNING_PROVIDER ?? defaultProvider,
    PAGASA_CAP_FEED_URL: environment.PAGASA_CAP_FEED_URL ?? DEFAULT_PAGASA_CAP_FEED_URL,
    WARNING_PROVIDER_TIMEOUT_MS: environment.WARNING_PROVIDER_TIMEOUT_MS ?? 10_000,
  });
  if (environment.NODE_ENV === 'production' && parsed.WARNING_PROVIDER === 'demo') {
    throw new Error('WARNING_PROVIDER=demo is not allowed in production.');
  }
  return {
    provider: parsed.WARNING_PROVIDER,
    pagasaCapFeedUrl: parsed.PAGASA_CAP_FEED_URL,
    timeoutMs: parsed.WARNING_PROVIDER_TIMEOUT_MS,
  };
}

export function demoSafetyAlertsEnabled(environment = process.env) {
  return environment.NODE_ENV === 'test' || (
    environment.NODE_ENV !== 'production' && environment.WARNING_PROVIDER === 'demo'
  );
}
