import type { SafetyAlert, SafetySource } from '@saraya/contracts';

export interface WarningProvider {
  readonly source: SafetySource;
  getActiveWarnings(): Promise<SafetyAlert[]>;
}

export class WarningProviderUnavailableError extends Error {
  constructor(message = 'Safety-warning provider data is unavailable.') {
    super(message);
    this.name = 'WarningProviderUnavailableError';
  }
}
