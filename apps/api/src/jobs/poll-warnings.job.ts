import { WarningIngestionService } from '../modules/safety-alerts/warning-ingestion.service';
import type { Job } from '../platform/jobs/job';

export function pollWarningsJob(
  ingestion: Pick<WarningIngestionService, 'ingest'> = new WarningIngestionService(),
): Job {
  return {
    name: 'poll-warnings',
    cron: '*/15 * * * *',
    async run() {
      const result = await ingestion.ingest();
      console.info(
        `[poll-warnings] fetched ${result.fetched}, changed ${result.changed}, ` +
        `expired ${result.expired}, notifications attempted ${result.notificationsAttempted}, ` +
        `notification failures ${result.notificationFailures}`,
      );
    },
  };
}
