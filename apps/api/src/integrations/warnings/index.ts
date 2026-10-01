import type { WarningConfiguration } from '../../platform/config/warning-config';
import { readWarningConfiguration } from '../../platform/config/warning-config';
import { MockWarningProvider } from './mock-warning.provider';
import { PagasaCapWarningProvider } from './pagasa-cap-warning.provider';
import { UnavailableWarningProvider } from './unavailable-warning.provider';

export * from './mock-warning.provider';
export * from './pagasa-cap-warning.provider';
export * from './unavailable-warning.provider';
export * from './warning.provider';

export function createWarningProvider(
  configuration: WarningConfiguration = readWarningConfiguration(),
  dependencies: { fetcher?: typeof fetch } = {},
) {
  if (configuration.provider === 'demo') return new MockWarningProvider();
  if (configuration.provider === 'unavailable') return new UnavailableWarningProvider();
  return new PagasaCapWarningProvider(
    configuration.pagasaCapFeedUrl,
    configuration.timeoutMs,
    dependencies.fetcher,
  );
}
