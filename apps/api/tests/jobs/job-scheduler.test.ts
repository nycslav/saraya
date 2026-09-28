import {
  createJobScheduler,
  NoopJobScheduler,
  RedisJobScheduler,
  type RedisLike,
} from '../../src/platform/jobs';
import type { Job } from '../../src/platform/jobs/job';

const testJob = {
  name: 'test-job',
  cron: '*/5 * * * *',
  run: jest.fn(),
} as unknown as Job;

function createRedisLikeMock(): jest.Mocked<RedisLike> {
  return {
    setex: jest.fn().mockResolvedValue('OK'),
    sadd: jest.fn().mockResolvedValue(1),
    del: jest.fn().mockResolvedValue(1),
    srem: jest.fn().mockResolvedValue(1),
  };
}

describe('NoopJobScheduler', () => {
  it('schedule and cancel are no-ops', async () => {
    const scheduler = new NoopJobScheduler();

    await expect(scheduler.schedule(testJob)).resolves.toBeUndefined();
    await expect(scheduler.cancel('test-job' as never)).resolves.toBeUndefined();
  });
});

describe('RedisJobScheduler', () => {
  it('registers job schedule and membership on schedule', async () => {
    const redis = createRedisLikeMock();
    const scheduler = new RedisJobScheduler(redis);

    await scheduler.schedule(testJob);

    expect(redis.setex).toHaveBeenCalledWith(
      'job:schedule:test-job',
      60,
      '*/5 * * * *',
    );
    expect(redis.sadd).toHaveBeenCalledWith('jobs:registered', 'test-job');
  });

  it('removes job schedule and membership on cancel', async () => {
    const redis = createRedisLikeMock();
    const scheduler = new RedisJobScheduler(redis);

    await scheduler.cancel('test-job' as never);

    expect(redis.del).toHaveBeenCalledWith('job:schedule:test-job');
    expect(redis.srem).toHaveBeenCalledWith('jobs:registered', 'test-job');
  });
});

describe('createJobScheduler', () => {
  it('returns NoopJobScheduler when backend is noop', () => {
    const scheduler = createJobScheduler({ enabled: true, backend: 'noop' });
    expect(scheduler).toBeInstanceOf(NoopJobScheduler);
  });

  it('returns RedisJobScheduler when backend is redis and Redis client is provided', () => {
    const redis = createRedisLikeMock();
    const scheduler = createJobScheduler(
      { enabled: true, backend: 'redis', redisUrl: 'redis://localhost:6379' },
      redis,
    );
    expect(scheduler).toBeInstanceOf(RedisJobScheduler);
  });

  it('falls back to NoopJobScheduler when redis backend is configured but no client is provided', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const scheduler = createJobScheduler({ enabled: true, backend: 'redis' });
    expect(scheduler).toBeInstanceOf(NoopJobScheduler);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('falling back to NoopJobScheduler'),
    );
    warnSpy.mockRestore();
  });
});
