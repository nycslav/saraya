export type { Job, JobName, JobRegistration } from './job';
export type { JobRunner, JobRunnerOptions, Timer } from './job-runner';
export type { JobScheduler } from './job-scheduler';
export type { RedisLike } from './redis-job-scheduler';

import { readSchedulerConfiguration } from '../config/scheduler-config';
import type { JobScheduler } from './job-scheduler';
import { NoopJobScheduler } from './job-scheduler';
import { RedisJobScheduler } from './redis-job-scheduler';
import type { RedisLike } from './redis-job-scheduler';

export { NoopJobScheduler } from './job-scheduler';
export { RedisJobScheduler } from './redis-job-scheduler';
export { InMemoryJobRunner } from './job-runner';

export function createJobScheduler(
  configuration = readSchedulerConfiguration(),
  redis?: RedisLike,
): JobScheduler {
  if (configuration.backend === 'redis' && redis) {
    return new RedisJobScheduler(redis);
  }

  if (configuration.backend === 'redis' && !redis) {
    console.warn(
      '[scheduler] SCHEDULER_BACKEND=redis configured but no Redis client provided; ' +
        'falling back to NoopJobScheduler. Provide a RedisLike client to createJobScheduler.',
    );
  }

  return new NoopJobScheduler();
}
