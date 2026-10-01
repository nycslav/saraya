import { PostgresNotificationRepository } from '../../src/modules/notifications/notification.postgres-repository';

const mockQuery = jest.fn();
jest.mock('../../src/platform/database/pool', () => ({ getPool: () => ({ query: mockQuery }) }));

describe('PostgresNotificationRepository', () => {
  beforeEach(() => mockQuery.mockReset());

  it('upserts a token by its unique provider token and deliberately transfers ownership', async () => {
    mockQuery.mockResolvedValue({ rowCount: 1, rows: [] });
    await new PostgresNotificationRepository().upsertToken('user-2', 'id-1', 'ExpoPushToken[token]', 'android');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT (push_token) DO UPDATE'), ['id-1', 'user-2', 'ExpoPushToken[token]', 'android']);
  });

  it('scopes deactivation to the authenticated owner', async () => {
    mockQuery.mockResolvedValue({ rowCount: 0, rows: [] });
    await expect(new PostgresNotificationRepository().deactivateToken('user-1', 'ExpoPushToken[token]')).resolves.toBe(false);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE user_id = $1 AND push_token = $2'), ['user-1', 'ExpoPushToken[token]']);
  });

  it('uses the selected category preference when finding eligible devices', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    await new PostgresNotificationRepository().findEligibleTokens(['user-1'], 'festival_reminder');
    expect(mockQuery.mock.calls[0]?.[0]).toContain('festival_reminders_enabled = true');
  });
});
