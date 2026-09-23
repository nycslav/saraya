import { safetyAlertSchema, type ResolvedLocation, type SafetyAlert } from '@saraya/contracts';

import { WarningProviderUnavailableError, type WarningProvider } from './warning.provider';

const timestamp = '2026-09-22T08:00:00.000Z';
const source = {
  provider: 'saraya-mock-warning',
  name: 'Saraya deterministic safety-warning demonstration provider',
  isDemo: true,
} as const;

const demoWarning = safetyAlertSchema.parse({
  id: 'mock-provider-bicol-rain-warning',
  alertType: 'weather',
  severity: 'yellow',
  title: '[DEMO] Mock provider rain warning for Bicol',
  summary: 'Synthetic warning used to demonstrate normalized safety-warning ingestion.',
  details: 'This warning comes from Saraya\'s deterministic mock warning provider, not PAGASA or Open-Meteo.',
  advice: ['Check real PAGASA and LGU guidance before making a travel decision.'],
  alternatives: ['Delay exposed activities until current official conditions are verified.'],
  affectedRegions: ['Bicol Region'],
  affectedAreaDescription: 'Demonstration-wide Bicol Region warning',
  startsAt: '2026-01-01T00:00:00.000Z',
  endsAt: '2030-12-31T23:59:59.000Z',
  source,
  createdAt: timestamp,
  updatedAt: timestamp,
});

export class MockWarningProvider implements WarningProvider {
  readonly source = source;

  constructor(private readonly shouldFail = false) {}

  async getActiveWarnings(location: ResolvedLocation): Promise<SafetyAlert[]> {
    if (this.shouldFail) throw new WarningProviderUnavailableError();
    return location.region === 'Bicol Region' ? [demoWarning] : [];
  }
}
