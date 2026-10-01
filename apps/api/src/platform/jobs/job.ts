export type JobName = 'send-reminders' | 'poll-weather' | 'poll-warnings';

export interface Job {
  name: JobName;
  cron: string;
  run: () => Promise<unknown>;
}

export type JobRegistration = Record<JobName, Job>;
