import { FestivalReminderService } from '../modules/festival-reminders/festival-reminder.service';
import type { Job } from '../platform/jobs/job';

export interface SendRemindersJobDependencies {
  festivalReminderService?: FestivalReminderService;
  limit?: number;
}

export function sendRemindersJob({
  festivalReminderService = new FestivalReminderService(),
  limit = 100,
}: SendRemindersJobDependencies = {}): Job {
  return {
    name: 'send-reminders',
    cron: '*/5 * * * *',
    async run() {
      const result = await festivalReminderService.dispatchDueReminders(limit);
      if (result.claimed > 0) {
        console.info(`[send-reminders] dispatched ${result.sent}/${result.claimed} reminders, skipped ${result.skipped}`);
      }
    },
  };
}
