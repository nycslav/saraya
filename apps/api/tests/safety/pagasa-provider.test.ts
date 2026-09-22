import { MockPagasaProvider, PagasaProviderUnavailableError } from '../../src/integrations/pagasa';

const bicol = { kind: 'region', label: 'Bicol Region', region: 'Bicol Region' } as const;
const davao = { kind: 'region', label: 'Davao Region', region: 'Davao Region' } as const;

describe('MockPagasaProvider', () => {
  it('returns deterministic demo weather and known warnings', async () => {
    const provider = new MockPagasaProvider();
    const first = await provider.getWeather(bicol);
    const second = await provider.getWeather(bicol);

    expect(first).toEqual(second);
    expect(first.source.isDemo).toBe(true);
    await expect(provider.getActiveWarnings(bicol)).resolves.toEqual([
      expect.objectContaining({ id: 'mock-provider-bicol-rain-warning', source: expect.objectContaining({ isDemo: true }) }),
    ]);
  });

  it('returns an explicit empty warning list for a configured no-warning region', async () => {
    await expect(new MockPagasaProvider().getActiveWarnings(davao)).resolves.toEqual([]);
  });

  it('simulates provider failure without network access', async () => {
    const provider = new MockPagasaProvider(true);
    await expect(provider.getWeather(bicol)).rejects.toBeInstanceOf(PagasaProviderUnavailableError);
    await expect(provider.getActiveWarnings(bicol)).rejects.toBeInstanceOf(PagasaProviderUnavailableError);
  });
});
