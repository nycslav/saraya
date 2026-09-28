import { PostgresSubscriptionRepository } from '../../src/modules/subscriptions/subscription.postgres-repository';
import { subscriptionConfiguration } from '../../src/modules/subscriptions/subscription.repository';

const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockConnect = jest.fn(() => ({ query: mockQuery, release: mockRelease }));

jest.mock('../../src/platform/database/pool', () => ({
  getPool: () => ({ connect: mockConnect, query: mockQuery }),
}));

describe('PostgresSubscriptionRepository', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockRelease.mockReset();
    mockConnect.mockClear();
  });

  it('reserves quota under a per-user row lock with parameterized SQL', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM generation_quota_reservations WHERE id')) return { rows: [], rowCount: 0 };
      if (sql.includes('FROM generation_quota_accounts WHERE user_id')) {
        return {
          rows: [{ free_used: 0, premium_period_start: null, premium_used: 0, top_up_balance: 0 }],
          rowCount: 1,
        };
      }
      if (sql.includes('FROM subscription_entitlements')) return { rows: [], rowCount: 0 };
      if (sql.includes('GROUP BY source')) return { rows: [], rowCount: 0 };
      return { rows: [], rowCount: 1 };
    });

    const result = await new PostgresSubscriptionRepository().reserveGeneration(
      'user-1',
      'reservation-1',
      new Date('2026-09-15T00:00:00.000Z'),
    );

    expect(result).toMatchObject({ source: 'included', access: 'free' });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('FOR UPDATE'),
      ['user-1'],
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO generation_quota_reservations'),
      ['reservation-1', 'user-1', 'included', 'free', null],
    );
    expect(mockQuery.mock.calls[0]?.[0]).toBe('BEGIN');
    expect(mockQuery.mock.calls.at(-1)?.[0]).toBe('COMMIT');
  });

  it('treats an existing webhook event ID as a duplicate before applying credits', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('INSERT INTO revenuecat_webhook_events')) return { rows: [], rowCount: 0 };
      return { rows: [], rowCount: 1 };
    });
    const result = await new PostgresSubscriptionRepository().processWebhook(
      {
        id: 'duplicate-event',
        type: 'NON_RENEWING_PURCHASE',
        event_timestamp_ms: 1_797_000_000_000,
        app_user_id: 'customer-1',
        aliases: [],
        transferred_from: [],
        transferred_to: [],
        product_id: subscriptionConfiguration.topUpProductId,
        entitlement_ids: [],
        transaction_id: 'transaction-1',
        environment: 'SANDBOX',
      },
      subscriptionConfiguration,
    );

    expect(result).toBe('duplicate');
    expect(mockQuery).not.toHaveBeenCalledWith(
      expect.stringContaining('generation_top_up_transactions'),
      expect.anything(),
    );
  });
});
