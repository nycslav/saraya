import { readSchedulerConfiguration } from '../platform/config/scheduler-config';
import { createJobScheduler } from '../platform/jobs';
import type { Job } from '../platform/jobs/job';
import { sendRemindersJob } from './send-reminders.job';
import { pollWeatherJob } from './poll-weather.job';
import { pollWarningsJob } from './poll-warnings.job';

export { sendRemindersJob } from './send-reminders.job';
export { pollWeatherJob } from './poll-weather.job';
export { pollWarningsJob } from './poll-warnings.job';

export function registerJobs(): Job[] {
  return [sendRemindersJob(), pollWeatherJob(), pollWarningsJob()];
}

export function createJobRunnerOptions(jobs: Job[] = registerJobs()) {
  const configuration = readSchedulerConfiguration();
  if (!configuration.enabled) return null;
  const scheduler = createJobScheduler(configuration);
  return { jobs, scheduler };
}
