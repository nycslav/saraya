import type { JobScheduler } from './job-scheduler';
import type { Job, JobName } from './job';

export interface RedisLike {
  setex(key: string, seconds: number, value: string): Promise<unknown>;
  sadd(key: string, ...members: string[]): Promise<number>;
  del(key: string): Promise<number>;
  srem(key: string, ...members: string[]): Promise<number>;
}

export class RedisJobScheduler implements JobScheduler {
  constructor(private readonly redis: RedisLike) {}

  async schedule(job: Job): Promise<void> {
    await this.redis.setex(`job:schedule:${job.name}`, 60, job.cron);
    await this.redis.sadd('jobs:registered', job.name);
  }

  async cancel(name: JobName): Promise<void> {
    await this.redis.del(`job:schedule:${name}`);
    await this.redis.srem('jobs:registered', name);
  }
}
