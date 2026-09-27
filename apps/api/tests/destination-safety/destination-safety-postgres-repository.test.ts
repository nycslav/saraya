import { safetyAlertSchema } from '@saraya/contracts';

import { PostgresDestinationSafetySubscriptionRepository } from '../../src/modules/destination-safety/destination-safety-subscription.postgres-repository';

const mockQuery = jest.fn();
jest.mock('../../src/platform/database/pool', () => ({ getPool: () => ({ query: mockQuery }) }));

const alert = safetyAlertSchema.parse({
  id: 'alert-1',
  alertType: 'weather',
  severity: 'yellow',
  title: '[DEMO] Heavy rain',
  summary: 'Synthetic test alert.',
  details: 'Synthetic test alert details.',
  advice: ['Verify official guidance.'],
  alternatives: [],
  affectedRegions: ['National Capital Region'],
  affectedAreaDescription: 'A synthetic area.',
  startsAt: '2026-09-28T00:00:00.000Z',
  endsAt: null,
  source: { provider: 'saraya-demo', name: 'Saraya demo', isDemo: true },
  createdAt: '2026-09-28T00:00:00.000Z',
  updatedAt: '2026-09-28T00:00:00.000Z',
});

describe('PostgresDestinationSafetySubscriptionRepository', () => {
  beforeEach(() => mockQuery.mockReset());

  it('upserts and reads subscriptions with stable ownership', async () => {
    const row = {
      user_id: 'user-1', destination_id: 'cebu-city', created_at: '2026-09-28T00:00:00.000Z',
    };
    mockQuery.mockResolvedValueOnce({ rows: [row] }).mockResolvedValueOnce({ rows: [row] });
    const repository = new PostgresDestinationSafetySubscriptionRepository();
    await repository.subscribe('user-1', 'cebu-city', row.created_at);
    await repository.find('user-1', 'cebu-city');
    expect(mockQuery.mock.calls[0]).toEqual([
      expect.stringContaining('ON CONFLICT (user_id, destination_id)'),
      ['user-1', 'cebu-city', row.created_at],
    ]);
    expect(mockQuery.mock.calls[1]?.[1]).toEqual(['user-1', 'cebu-city']);
  });

  it('scopes unsubscribe to the owner and destination', async () => {
    mockQuery.mockResolvedValue({ rowCount: 1, rows: [] });
    await expect(new PostgresDestinationSafetySubscriptionRepository()
      .unsubscribe('user-1', 'cebu-city')).resolves.toBe(true);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('user_id = $1'), [
      'user-1', 'cebu-city',
    ]);
  });

  it('uses PostGIS or region matching to identify affected subscribers', async () => {
    mockQuery.mockResolvedValue({ rows: [{ user_id: 'user-1' }] });
    await expect(new PostgresDestinationSafetySubscriptionRepository()
      .findSubscriberUserIdsForAlert(alert)).resolves.toEqual(['user-1']);
    expect(mockQuery.mock.calls[0]?.[0]).toContain('ST_Covers');
    expect(mockQuery.mock.calls[0]?.[0]).toContain('destination.region = ANY');
    expect(mockQuery.mock.calls[0]?.[1]).toEqual([null, ['National Capital Region']]);
  });
});
