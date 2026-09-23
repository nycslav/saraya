import type { ResolvedLocation, SafetyAlert, SafetySource } from '@saraya/contracts';

export interface WarningProvider {
  readonly source: SafetySource;
  getActiveWarnings(location: ResolvedLocation): Promise<SafetyAlert[]>;
}

export class WarningProviderUnavailableError extends Error {
  constructor() {
    super('Safety-warning provider data is unavailable.');
    this.name = 'WarningProviderUnavailableError';
  }
}
