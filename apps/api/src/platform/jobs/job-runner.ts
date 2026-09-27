import type { Job, JobName } from './job';
import type { JobScheduler } from './job-scheduler';

export type Timer = { unref: () => void };

export interface JobRunnerOptions {
  now?: () => Date;
  setTimeout?: (callback: () => void, delay: number) => Timer;
  clearTimeout?: (timer: Timer) => void;
}

export interface JobRunner {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export class InMemoryJobRunner implements JobRunner {
  private readonly timers = new Map<JobName, Timer>();
  private running = false;

  constructor(
    private readonly jobs: Job[],
    private readonly scheduler: JobScheduler,
    private readonly options: JobRunnerOptions = {},
  ) {}

  async start() {
    if (this.running) return;
    this.running = true;

    for (const job of this.jobs) {
      await this.scheduler.schedule(job);
      if (this.running) this.scheduleNext(job);
    }
  }

  async stop() {
    this.running = false;
    for (const timer of this.timers.values()) {
      this.clearTimer(timer);
    }
    this.timers.clear();
    await Promise.all(this.jobs.map((job) => this.scheduler.cancel(job.name)));
  }

  private scheduleNext(job: Job) {
    const delay = this.nextRunDelay(job.cron, this.now());
    const timer = this.setTimer(() => void this.execute(job), delay);
    timer.unref();
    this.timers.set(job.name, timer);
  }

  private async execute(job: Job) {
    if (!this.running) return;
    try {
      await job.run();
    } catch (error) {
      console.error(`[job:${job.name}]`, error);
    }
    this.timers.delete(job.name);
    if (this.running) this.scheduleNext(job);
  }

  private setTimer(callback: () => void, delay: number): Timer {
    if (this.options.setTimeout) return this.options.setTimeout(callback, delay);
    return globalThis.setTimeout(callback, delay) as Timer;
  }

  private clearTimer(timer: Timer) {
    if (this.options.clearTimeout) {
      this.options.clearTimeout(timer);
      return;
    }
    globalThis.clearTimeout(timer as ReturnType<typeof globalThis.setTimeout>);
  }

  private now(): Date {
    return this.options.now?.() ?? new Date();
  }

  private nextRunDelay(cron: string, from: Date): number {
    const fields = cron.split(' ');
    const minutePattern = fields[0] ?? '0';
    const hourPattern = fields[1] ?? '*';

    const next = new Date(from);
    next.setSeconds(0, 0);

    if (hourPattern === '*' && minutePattern.startsWith('*/')) {
      const step = Number(minutePattern.slice(2));
      const currentMinute = next.getMinutes();
      const nextMinute = Math.ceil((currentMinute + 1) / step) * step;
      if (nextMinute >= 60) {
        next.setHours(next.getHours() + 1, 0, 0, 0);
      } else {
        next.setMinutes(nextMinute);
      }
    } else if (hourPattern === '*' && /^\d+$/.test(minutePattern)) {
      const targetMinute = Number(minutePattern);
      next.setMinutes(targetMinute, 0, 0);
      if (next <= from) {
        next.setHours(next.getHours() + 1);
        next.setMinutes(targetMinute, 0, 0);
      }
    } else {
      next.setMinutes(0, 0, 0);
    }

    if (next <= from) {
      next.setHours(next.getHours() + 24);
    }

    return Math.max(1_000, next.getTime() - from.getTime());
  }
}
