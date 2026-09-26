import { PostgresFestivalReminderRepository } from '../../src/modules/festival-reminders/festival-reminder.postgres-repository';

const mockQuery = jest.fn();

jest.mock('../../src/platform/database/pool', () => ({
  getPool: () => ({ query: mockQuery }),
}));

const row = {
  id: '00000000-0000-4000-8000-000000000001',
  user_id: 'user-1',
  festival_id: 'masskara',
  lead_days: 1,
  remind_at: '2026-09-30T01:00:00.000Z',
  status: 'active',
  sent_at: null,
  created_at: '2026-09-20T00:00:00.000Z',
  updated_at: '2026-09-20T00:00:00.000Z',
};

describe('PostgresFestivalReminderRepository', () => {
  beforeEach(() => mockQuery.mockReset());

  it('uses the partial uniqueness rule for idempotent creation', async () => {
    mockQuery.mockResolvedValue({ rows: [row] });
    const repository = new PostgresFestivalReminderRepository();
    await expect(
      repository.createOrUpdate({
        id: row.id,
        userId: row.user_id,
        festivalId: row.festival_id,
        leadDays: 1,
        remindAt: row.remind_at,
        now: row.created_at,
      }),
    ).resolves.toEqual(expect.objectContaining({ festivalId: 'masskara', userId: 'user-1' }));
    expect(mockQuery.mock.calls[0]?.[0]).toEqual(expect.stringContaining('ON CONFLICT'));
    expect(mockQuery.mock.calls[0]?.[1]).toEqual([
      row.id,
      'user-1',
      'masskara',
      1,
      row.remind_at,
      row.created_at,
    ]);
  });

  it('scopes lookup, list, and cancellation to user ownership', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [row] })
      .mockResolvedValueOnce({ rows: [row] })
      .mockResolvedValueOnce({ rowCount: 1 });
    const repository = new PostgresFestivalReminderRepository();

    await repository.findActive('user-1', 'masskara');
    await repository.listActive('user-1');
    await repository.cancel('user-1', 'masskara', '2026-09-21T00:00:00.000Z');

    expect(mockQuery.mock.calls[0]?.[1]).toEqual(['user-1', 'masskara']);
    expect(mockQuery.mock.calls[1]?.[1]).toEqual(['user-1']);
    expect(mockQuery.mock.calls[2]?.[1]).toEqual([
      'user-1',
      'masskara',
      '2026-09-21T00:00:00.000Z',
    ]);
  });

  it('atomically claims due rows with locking and marks dispatch completion', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ ...row, status: 'dispatching' }] })
      .mockResolvedValueOnce({ rowCount: 1 });
    const repository = new PostgresFestivalReminderRepository();

    await expect(repository.claimDue('2026-10-01T00:00:00.000Z', 100)).resolves.toEqual([
      expect.objectContaining({ status: 'dispatching' }),
    ]);
    expect(mockQuery.mock.calls[0]?.[0]).toEqual(expect.stringContaining('FOR UPDATE SKIP LOCKED'));
    await repository.completeDispatch(
      row.id,
      'sent',
      '2026-10-01T00:00:00.000Z',
    );
    expect(mockQuery.mock.calls[1]?.[1]).toEqual([
      row.id,
      'sent',
      '2026-10-01T00:00:00.000Z',
    ]);
  });
});
