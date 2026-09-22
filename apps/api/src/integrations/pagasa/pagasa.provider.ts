import type { ResolvedLocation, SafetyAlert, WeatherResponse } from '@saraya/contracts';

export interface PagasaProvider {
  getWeather(location: ResolvedLocation): Promise<WeatherResponse>;
  getActiveWarnings(location: ResolvedLocation): Promise<SafetyAlert[]>;
}

export class PagasaProviderUnavailableError extends Error {
  constructor() {
    super('Weather provider data is unavailable.');
    this.name = 'PagasaProviderUnavailableError';
  }
}
