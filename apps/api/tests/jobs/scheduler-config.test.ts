import { readSchedulerConfiguration } from '../../src/platform/config/scheduler-config';

describe('readSchedulerConfiguration', () => {
  it('defaults to noop backend and disabled in development', () => {
    const config = readSchedulerConfiguration({
      NODE_ENV: 'development',
      SCHEDULER_ENABLED: undefined,
      SCHEDULER_BACKEND: undefined,
      REDIS_URL: undefined,
    });

    expect(config).toMatchObject({
      enabled: false,
      backend: 'noop',
      redisUrl: undefined,
    });
  });

  it('enables scheduler in production by default', () => {
    const config = readSchedulerConfiguration({
      NODE_ENV: 'production',
      SCHEDULER_ENABLED: undefined,
      SCHEDULER_BACKEND: undefined,
      REDIS_URL: undefined,
    });

    expect(config.enabled).toBe(true);
  });

  it('throws when redis backend is configured without REDIS_URL', () => {
    expect(() =>
      readSchedulerConfiguration({
        NODE_ENV: 'production',
        SCHEDULER_ENABLED: 'true',
        SCHEDULER_BACKEND: 'redis',
        REDIS_URL: undefined,
      }),
    ).toThrow('REDIS_URL is required when SCHEDULER_BACKEND=redis');
  });

  it('parses boolean and string environment values', () => {
    const config = readSchedulerConfiguration({
      SCHEDULER_ENABLED: 'true',
      SCHEDULER_BACKEND: 'redis',
      REDIS_URL: 'redis://localhost:6379',
    });

    expect(config).toEqual({
      enabled: true,
      backend: 'redis',
      redisUrl: 'redis://localhost:6379',
    });
  });
});
