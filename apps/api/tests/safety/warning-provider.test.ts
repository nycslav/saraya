import { MockWarningProvider, WarningProviderUnavailableError } from '../../src/integrations/warnings';

describe('MockWarningProvider', () => {
  it('keeps deterministic demo warning behavior', async () => {
    const provider = new MockWarningProvider();
    await expect(provider.getActiveWarnings()).resolves.toEqual([
      expect.objectContaining({ id: 'mock-provider-bicol-rain-warning', source: expect.objectContaining({ isDemo: true }) }),
    ]);
  });

  it('supports deterministic failure simulation', async () => {
    await expect(new MockWarningProvider(true).getActiveWarnings())
      .rejects.toBeInstanceOf(WarningProviderUnavailableError);
  });
});
