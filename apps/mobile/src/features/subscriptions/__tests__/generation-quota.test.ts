import { GenerationQuotaExhaustedError } from '../gateways/generation-quota.gateway';
import { LocalGenerationQuotaGateway, type QuotaStorage } from '../services/local-generation-quota';

class MemoryStorage implements QuotaStorage {
  value: string | null = null;
  async getItem() { return this.value; }
  async setItem(_key: string, value: string) { this.value = value; }
}

describe('demo generation quota gateway', () => {
  let storage: MemoryStorage;
  let now: Date;
  let gateway: LocalGenerationQuotaGateway;

  beforeEach(() => {
    storage = new MemoryStorage();
    now = new Date('2026-09-15T12:00:00.000Z');
    gateway = new LocalGenerationQuotaGateway(storage, () => now);
  });

  it('starts a Free account with 3 lifetime generations and decrements after success', async () => {
    await expect(gateway.getQuota('free')).resolves.toMatchObject({
      includedLimit: 3,
      includedRemaining: 3,
      canRegenerate: false,
    });
    await expect(gateway.consumeAfterSuccess('free')).resolves.toMatchObject({
      source: 'included',
      quota: { includedRemaining: 2 },
    });
  });

  it('does not consume quota unless success explicitly commits consumption', async () => {
    await gateway.getQuota('free');
    await expect(gateway.getQuota('free')).resolves.toMatchObject({ includedRemaining: 3 });
  });

  it('blocks a fourth Free generation after 3 successful generations', async () => {
    await gateway.consumeAfterSuccess('free');
    await gateway.consumeAfterSuccess('free');
    await gateway.consumeAfterSuccess('free');
    await expect(gateway.getQuota('free')).resolves.toMatchObject({ canGenerate: false });
    await expect(gateway.consumeAfterSuccess('free')).rejects.toBeInstanceOf(GenerationQuotaExhaustedError);
  });

  it('allows an exhausted Free account to continue from purchased credits', async () => {
    await gateway.consumeAfterSuccess('free');
    await gateway.consumeAfterSuccess('free');
    await gateway.consumeAfterSuccess('free');
    await gateway.creditTopUp('free', 'transaction-1');

    await expect(gateway.consumeAfterSuccess('free')).resolves.toMatchObject({
      source: 'top-up',
      quota: { includedRemaining: 0, topUpRemaining: 9 },
    });
  });

  it('gives Premium 10 included generations and resets them at the next UTC calendar month', async () => {
    await expect(gateway.getQuota('premium')).resolves.toMatchObject({
      includedLimit: 10,
      includedRemaining: 10,
      periodStart: '2026-09-01T00:00:00.000Z',
      periodEnd: '2026-10-01T00:00:00.000Z',
    });
    await gateway.consumeAfterSuccess('premium');
    now = new Date('2026-10-01T00:00:00.000Z');
    await expect(gateway.getQuota('premium')).resolves.toMatchObject({
      includedRemaining: 10,
      periodStart: '2026-10-01T00:00:00.000Z',
    });
  });

  it('preserves purchased credits on reset and consumes included credits first', async () => {
    await gateway.creditTopUp('premium', 'transaction-1');
    const consumption = await gateway.consumeAfterSuccess('premium');
    expect(consumption.source).toBe('included');
    expect(consumption.quota.topUpRemaining).toBe(10);

    now = new Date('2026-10-01T00:00:00.000Z');
    await expect(gateway.getQuota('premium')).resolves.toMatchObject({
      includedRemaining: 10,
      topUpRemaining: 10,
    });
  });

  it('adds exactly 10 top-up credits and ignores duplicate transaction processing', async () => {
    await expect(gateway.creditTopUp('free', 'transaction-1')).resolves.toMatchObject({
      credited: true,
      quota: { topUpRemaining: 10 },
    });
    await expect(gateway.creditTopUp('free', 'transaction-1')).resolves.toMatchObject({
      credited: false,
      quota: { topUpRemaining: 10 },
    });
  });
});
