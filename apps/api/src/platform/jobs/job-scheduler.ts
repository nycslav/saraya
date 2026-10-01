import type { Job, JobName } from './job';

export interface JobScheduler {
  schedule(job: Job): Promise<void>;
  cancel(name: JobName): Promise<void>;
}

export class NoopJobScheduler implements JobScheduler {
  async schedule(_job: Job) {
    // The shared Redis layer is not operational yet.
  }

  async cancel(_name: JobName) {
    // The shared Redis layer is not operational yet.
  }
}
