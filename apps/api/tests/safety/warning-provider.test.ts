import { MockWarningProvider, WarningProviderUnavailableError } from '../../src/integrations/warnings';

const bicol = { kind: 'region', label: 'Bicol Region', region: 'Bicol Region' } as const;
const davao = { kind: 'region', label: 'Davao Region', region: 'Davao Region' } as const;

describe('MockWarningProvider', () => {
  it('keeps deterministic known and empty warning behavior', async () => {
    const provider = new MockWarningProvider();
    await expect(provider.getActiveWarnings(bicol)).resolves.toEqual([
      expect.objectContaining({ id: 'mock-provider-bicol-rain-warning', source: expect.objectContaining({ isDemo: true }) }),
    ]);
    await expect(provider.getActiveWarnings(davao)).resolves.toEqual([]);
  });

  it('supports deterministic failure simulation', async () => {
    await expect(new MockWarningProvider(true).getActiveWarnings(bicol))
      .rejects.toBeInstanceOf(WarningProviderUnavailableError);
  });
});
