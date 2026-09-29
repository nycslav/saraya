import { pollWarningsJob } from '../../src/jobs';

describe('poll-warnings job', () => {
  it('runs authoritative warning ingestion every fifteen minutes', async () => {
    const ingest = jest.fn().mockResolvedValue({
      fetched: 1, changed: 1, expired: 0, notificationsAttempted: 1,
      notificationFailures: 0, demoSkipped: false,
    });
    const job = pollWarningsJob({ ingest });
    const consoleSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);

    expect(job.name).toBe('poll-warnings');
    expect(job.cron).toBe('*/15 * * * *');
    await job.run();
    expect(ingest).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('changed 1'));
    consoleSpy.mockRestore();
  });
});
