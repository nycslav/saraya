import type { SafetySource } from '@saraya/contracts';

import { WarningProviderUnavailableError, type WarningProvider } from './warning.provider';

export class UnavailableWarningProvider implements WarningProvider {
  readonly source: SafetySource = {
    provider: 'unconfigured-authoritative-warning-provider',
    name: 'Authoritative warning provider unavailable',
    isDemo: false,
  };

  async getActiveWarnings(): Promise<never> {
    throw new WarningProviderUnavailableError('No authoritative warning provider is configured.');
  }
}
