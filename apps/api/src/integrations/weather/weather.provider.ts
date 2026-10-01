import type { ResolvedLocation, SafetySource, WeatherResponse } from '@saraya/contracts';

export interface WeatherProvider {
  readonly source: SafetySource;
  getWeather(location: ResolvedLocation): Promise<WeatherResponse>;
}

export class WeatherProviderUnavailableError extends Error {
  constructor(message = 'Weather provider data is unavailable.', options?: ErrorOptions) {
    super(message, options);
    this.name = 'WeatherProviderUnavailableError';
  }
}
