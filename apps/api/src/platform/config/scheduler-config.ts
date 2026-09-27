import { z } from 'zod';

import './load-env';

const booleanFromString = z
  .string()
  .optional()
  .transform((value) => value !== undefined && value !== 'false' && value !== '0');

const schedulerConfigurationSchema = z.object({
  SCHEDULER_ENABLED: booleanFromString.default(false),
  SCHEDULER_BACKEND: z.enum(['noop', 'redis']).default('noop'),
  REDIS_URL: z.url().optional(),
});

export interface SchedulerConfiguration {
  enabled: boolean;
  backend: 'noop' | 'redis';
  redisUrl?: string;
}

export function readSchedulerConfiguration(
  environment: Record<string, string | undefined> = process.env,
): SchedulerConfiguration {
  const parsed = schedulerConfigurationSchema.parse({
    SCHEDULER_ENABLED: environment.SCHEDULER_ENABLED ?? (
      environment.NODE_ENV === 'production' ? 'true' : 'false'
    ),
    SCHEDULER_BACKEND: environment.SCHEDULER_BACKEND ?? 'noop',
    REDIS_URL: environment.REDIS_URL,
  });

  if (parsed.SCHEDULER_BACKEND === 'redis' && !parsed.REDIS_URL) {
    throw new Error('REDIS_URL is required when SCHEDULER_BACKEND=redis');
  }

  return {
    enabled: parsed.SCHEDULER_ENABLED,
    backend: parsed.SCHEDULER_BACKEND,
    redisUrl: parsed.REDIS_URL,
  };
}
