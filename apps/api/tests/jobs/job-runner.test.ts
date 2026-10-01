import { InMemoryJobRunner, NoopJobScheduler, type JobScheduler, type Timer } from '../../src/platform/jobs';
import type { Job } from '../../src/platform/jobs/job';

const mockJob = {
  name: 'test-job',
  cron: '*/5 * * * *',
  run: jest.fn(),
} as unknown as Job;

const noopTimer: Timer = { unref: jest.fn() };

describe('InMemoryJobRunner', () => {
  it('starts, runs jobs on schedule, and stops cleanly', async () => {
    const now = new Date('2026-09-26T10:00:00.000Z');
    const setTimeout = jest.fn((): Timer => noopTimer);
    const clearTimeout = jest.fn();

    const runner = new InMemoryJobRunner([mockJob], new NoopJobScheduler(), {
      now: () => now,
      setTimeout,
      clearTimeout,
    });

    await runner.start();

    const delay = (setTimeout as jest.Mock).mock.calls[0]?.[1] as number;
    expect(delay).toBeGreaterThan(0);
    expect(delay).toBeLessThanOrEqual(5 * 60 * 1000);
    expect(delay % (1_000)).toBe(0);

    await runner.stop();
    expect(clearTimeout).toHaveBeenCalled();
  });

  it('calls scheduler.schedule for each job on start', async () => {
    const scheduler: JobScheduler = {
      schedule: jest.fn(),
      cancel: jest.fn(),
    };

    const runner = new InMemoryJobRunner([mockJob], scheduler, {
      setTimeout: () => noopTimer,
    });

    await runner.start();

    expect(scheduler.schedule).toHaveBeenCalledWith(mockJob);
    await runner.stop();
  });

  it('stops scheduling after calling stop', async () => {
    const clearTimeout = jest.fn();
    const setTimeout = jest.fn(() => noopTimer);

    const runner = new InMemoryJobRunner([mockJob], new NoopJobScheduler(), {
      setTimeout,
      clearTimeout,
    });

    await runner.start();
    await runner.stop();

    expect(clearTimeout).toHaveBeenCalledTimes(1);
  });

  it('uses platform timers by default and cancels them on shutdown', async () => {
    jest.useFakeTimers();
    const scheduler: JobScheduler = {
      schedule: jest.fn(),
      cancel: jest.fn(),
    };

    try {
      const runner = new InMemoryJobRunner([mockJob], scheduler, {
        now: () => new Date('2026-09-26T10:00:00.000Z'),
      });

      await runner.start();
      expect(jest.getTimerCount()).toBe(1);

      await runner.stop();
      expect(jest.getTimerCount()).toBe(0);
      expect(scheduler.cancel).toHaveBeenCalledWith(mockJob.name);
    } finally {
      jest.useRealTimers();
    }
  });
});
