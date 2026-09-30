import { AccountManagementRepository } from '../../src/modules/account-management/account-management.repository';

const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockConnect = jest.fn(() => ({ query: mockQuery, release: mockRelease }));

jest.mock('../../src/platform/database/pool', () => ({
  getPool: () => ({ connect: mockConnect, query: mockQuery }),
}));

describe('AccountManagementRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports readable user data and photo references without credentials or push tokens', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM users')) return { rows: [{
        id: 'user-1', email: 'traveler@example.com', avatar_url: '/uploads/check-ins/avatar.jpg',
      }] };
      if (sql.includes('FROM check_ins')) return { rows: [{
        id: 'visit-1', user_id: 'user-1', photo_url: '/uploads/check-ins/journey.jpg',
      }] };
      if (sql.includes('FROM device_tokens')) return { rows: [{
        platform: 'android', is_active: true, created_at: 'now', updated_at: 'now', last_seen_at: 'now',
      }] };
      return { rows: [] };
    });

    const bundle = await new AccountManagementRepository().exportData('user-1');
    const serialized = JSON.stringify(bundle.data);

    expect(bundle.photoUrls).toEqual([
      '/uploads/check-ins/avatar.jpg', '/uploads/check-ins/journey.jpg',
    ]);
    expect(serialized).toContain('traveler@example.com');
    expect(serialized).not.toContain('push_token');
    expect(serialized).not.toContain('access_token');
    expect(serialized).not.toContain('refresh_token');
    expect(serialized).not.toContain('google_subject');
  });

  it('deletes all user-owned records and anonymizes retained transaction events', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT avatar_url AS photo_url')) {
        return { rows: [{ photo_url: '/uploads/check-ins/avatar.jpg' }] };
      }
      if (sql.includes('DELETE FROM users')) return { rows: [{ id: 'user-1' }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });

    await expect(new AccountManagementRepository().deleteAccount('user-1'))
      .resolves.toEqual(['/uploads/check-ins/avatar.jpg']);

    const statements = mockQuery.mock.calls.map(([sql]) => sql as string).join('\n');
    for (const table of [
      'refresh_tokens', 'device_tokens', 'notification_preferences', 'check_ins',
      'bucket_list_items', 'itineraries', 'destination_safety_subscriptions',
      'region_safety_subscriptions', 'subscription_entitlements', 'generation_quota_accounts',
    ]) expect(statements).toContain(`DELETE FROM ${table}`);
    expect(statements).toContain('UPDATE revenuecat_webhook_events');
    expect(statements).toContain('DELETE FROM users');
    expect(mockQuery.mock.calls[0]?.[0]).toBe('BEGIN');
    expect(mockQuery.mock.calls.at(-1)?.[0]).toBe('COMMIT');
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it('does not commit account deletion when uploaded photos cannot be removed', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT avatar_url AS photo_url')) {
        return { rows: [{ photo_url: '/uploads/check-ins/avatar.jpg' }] };
      }
      if (sql.includes('DELETE FROM users')) return { rows: [{ id: 'user-1' }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });

    await expect(new AccountManagementRepository().deleteAccount(
      'user-1',
      async () => { throw new Error('storage unavailable'); },
    )).rejects.toThrow('storage unavailable');

    expect(mockQuery.mock.calls.at(-1)?.[0]).toBe('ROLLBACK');
  });
});
