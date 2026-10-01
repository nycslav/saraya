import { createWarningProvider, PagasaCapWarningProvider, UnavailableWarningProvider } from '../../src/integrations/warnings';
import { readWarningConfiguration } from '../../src/platform/config/warning-config';

describe('warning provider configuration', () => {
  it('selects PAGASA CAP by default outside tests and supports an explicit unavailable boundary', () => {
    const live = readWarningConfiguration({ NODE_ENV: 'production' });
    expect(createWarningProvider(live)).toBeInstanceOf(PagasaCapWarningProvider);

    const unavailable = readWarningConfiguration({
      NODE_ENV: 'production', WARNING_PROVIDER: 'unavailable',
    });
    expect(createWarningProvider(unavailable)).toBeInstanceOf(UnavailableWarningProvider);
  });

  it('refuses demo warning data in production', () => {
    expect(() => readWarningConfiguration({
      NODE_ENV: 'production', WARNING_PROVIDER: 'demo',
    })).toThrow('not allowed in production');
  });
});
