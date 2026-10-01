import { createWeatherProvider } from '../integrations/weather';
import type { WeatherProvider } from '../integrations/weather';
import type { ResolvedLocation } from '@saraya/contracts';

import { seedDestinations } from '../modules/destinations/destination.seed';
import type { Job } from '../platform/jobs/job';

const regions = [...new Set(seedDestinations.map((destination) => destination.region))];

function createWeatherLocations(): ResolvedLocation[] {
  return regions.map((region) => ({
    kind: 'region' as const,
    label: region,
    region,
  }));
}

export interface PollWeatherJobDependencies {
  weatherProvider?: WeatherProvider;
  locations?: ResolvedLocation[];
}

export function pollWeatherJob({
  weatherProvider = createWeatherProvider(),
  locations = createWeatherLocations(),
}: PollWeatherJobDependencies = {}): Job {
  return {
    name: 'poll-weather',
    cron: '0 * * * *',
    async run() {
      const results = await Promise.allSettled(
        locations.map((location) => weatherProvider.getWeather(location)),
      );
      const successful = results.filter((result) => result.status === 'fulfilled').length;
      const failed = results.filter((result) => result.status === 'rejected').length;
      console.info(`[poll-weather] fetched weather for ${successful}/${locations.length} locations, ${failed} failed`);
    },
  };
}
