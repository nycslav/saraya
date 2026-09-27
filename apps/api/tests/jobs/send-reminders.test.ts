import { sendRemindersJob } from '../../src/jobs';

describe('send-reminders job', () => {
  it('returns a Job with the correct name and cron schedule', () => {
    const mockService = { dispatchDueReminders: jest.fn() };
    const job = sendRemindersJob({ festivalReminderService: mockService as never });

    expect(job.name).toBe('send-reminders');
    expect(job.cron).toBe('*/5 * * * *');
  });

  it('delegates to FestivalReminderService.dispatchDueReminders with default limit of 100', async () => {
    const mockService = { dispatchDueReminders: jest.fn().mockResolvedValue({ claimed: 0, sent: 0, skipped: 0 }) };
    const job = sendRemindersJob({ festivalReminderService: mockService as never });

    await job.run();

    expect(mockService.dispatchDueReminders).toHaveBeenCalledWith(100);
  });

  it('uses the injected limit when provided', async () => {
    const mockService = { dispatchDueReminders: jest.fn().mockResolvedValue({ claimed: 0, sent: 0, skipped: 0 }) };
    const job = sendRemindersJob({ festivalReminderService: mockService as never, limit: 50 });

    await job.run();

    expect(mockService.dispatchDueReminders).toHaveBeenCalledWith(50);
  });

  it('logs dispatch results when reminders are claimed', async () => {
    const mockService = {
      dispatchDueReminders: jest.fn().mockResolvedValue({ claimed: 3, sent: 2, skipped: 1 }),
    };
    const job = sendRemindersJob({ festivalReminderService: mockService as never, limit: 100 });

    const consoleSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);

    await job.run();

    expect(mockService.dispatchDueReminders).toHaveBeenCalledWith(100);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('dispatched 2/3 reminders, skipped 1'),
    );

    consoleSpy.mockRestore();
  });

  it('does not log when no reminders are due', async () => {
    const mockService = {
      dispatchDueReminders: jest.fn().mockResolvedValue({ claimed: 0, sent: 0, skipped: 0 }),
    };

    const job = sendRemindersJob({ festivalReminderService: mockService as never });

    const consoleSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);

    await job.run();

    expect(mockService.dispatchDueReminders).toHaveBeenCalledWith(100);
    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
