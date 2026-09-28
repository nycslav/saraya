import { pollWeatherJob } from '../../src/jobs';
import { MockWeatherProvider } from '../../src/integrations/weather';
import type { ResolvedLocation } from '@saraya/contracts';

const locations: ResolvedLocation[] = [
  { kind: 'region', label: 'Test Region', region: 'Test Region' },
];

describe('poll-weather job', () => {
  it('returns a Job with the hourly cron schedule', () => {
    const job = pollWeatherJob({ locations, weatherProvider: new MockWeatherProvider() });

    expect(job.name).toBe('poll-weather');
    expect(job.cron).toBe('0 * * * *');
  });

  it('fetches weather for all locations and logs the result count', async () => {
    const provider = { getWeather: jest.fn().mockResolvedValue({}) };
    const job = pollWeatherJob({ locations, weatherProvider: provider as never });

    const consoleSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);

    await job.run();

    expect(provider.getWeather).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('fetched weather for 1/1 locations, 0 failed'),
    );

    consoleSpy.mockRestore();
  });

  it('continues when some locations fail and logs the correct count', async () => {
    const locations: ResolvedLocation[] = [
      { kind: 'region', label: 'Region A', region: 'Region A' },
      { kind: 'region', label: 'Region B', region: 'Region B' },
    ];
    const provider = {
      getWeather: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('upstream timeout')),
    };
    const job = pollWeatherJob({ locations, weatherProvider: provider as never });

    const consoleSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);

    await job.run();

    expect(provider.getWeather).toHaveBeenCalledTimes(2);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('fetched weather for 1/2 locations, 1 failed'),
    );

    consoleSpy.mockRestore();
  });
});
