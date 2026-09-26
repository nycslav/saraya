import { InMemoryFestivalReminderRepository } from '../../src/modules/festival-reminders/festival-reminder.repository';

const first = {
  id: '00000000-0000-4000-8000-000000000001',
  userId: 'user-1',
  festivalId: 'masskara',
  leadDays: 1 as const,
  remindAt: '2026-09-30T01:00:00.000Z',
  now: '2026-09-20T00:00:00.000Z',
};

describe('InMemoryFestivalReminderRepository', () => {
  it('creates idempotently, looks up, and lists only the authenticated owner', async () => {
    const repository = new InMemoryFestivalReminderRepository();
    const created = await repository.createOrUpdate(first);
    const duplicate = await repository.createOrUpdate({
      ...first,
      id: '00000000-0000-4000-8000-000000000002',
    });

    expect(duplicate.id).toBe(created.id);
    await expect(repository.findActive('user-1', 'masskara')).resolves.toEqual(
      expect.objectContaining({ id: created.id }),
    );
    await expect(repository.findActive('user-2', 'masskara')).resolves.toBeNull();
    await expect(repository.listActive('user-1')).resolves.toHaveLength(1);
    await expect(repository.listActive('user-2')).resolves.toEqual([]);
  });

  it('isolates cancellation by owner', async () => {
    const repository = new InMemoryFestivalReminderRepository();
    await repository.createOrUpdate(first);

    await expect(
      repository.cancel('user-2', 'masskara', '2026-09-21T00:00:00.000Z'),
    ).resolves.toBe(false);
    await expect(repository.findActive('user-1', 'masskara')).resolves.not.toBeNull();
    await expect(
      repository.cancel('user-1', 'masskara', '2026-09-21T00:00:00.000Z'),
    ).resolves.toBe(true);
    await expect(repository.findActive('user-1', 'masskara')).resolves.toBeNull();
  });

  it('claims due reminders once and completes dispatch state', async () => {
    const repository = new InMemoryFestivalReminderRepository();
    await repository.createOrUpdate(first);

    const claimed = await repository.claimDue('2026-10-01T00:00:00.000Z', 10);
    expect(claimed).toEqual([expect.objectContaining({ status: 'dispatching' })]);
    await expect(repository.claimDue('2026-10-01T00:00:00.000Z', 10)).resolves.toEqual([]);
    await repository.completeDispatch(
      claimed[0]!.id,
      'sent',
      '2026-10-01T00:00:00.000Z',
    );
    await expect(repository.findActive('user-1', 'masskara')).resolves.toBeNull();
  });
});
