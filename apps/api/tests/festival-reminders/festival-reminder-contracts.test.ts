import {
  createFestivalReminderSchema,
  festivalReminderSchema,
} from '@saraya/contracts';

describe('festival reminder contracts', () => {
  it('accepts supported timing and a valid reminder response', () => {
    expect(createFestivalReminderSchema.parse({ leadDays: 1 })).toEqual({ leadDays: 1 });
    expect(createFestivalReminderSchema.parse({})).toEqual({ leadDays: 1 });
    expect(() =>
      festivalReminderSchema.parse({
        id: '00000000-0000-4000-8000-000000000001',
        festivalId: 'masskara',
        leadDays: 1,
        remindAt: '2026-09-30T01:00:00.000Z',
        status: 'active',
        sentAt: null,
        createdAt: '2026-09-20T00:00:00.000Z',
        updatedAt: '2026-09-20T00:00:00.000Z',
      }),
    ).not.toThrow();
  });

  it('rejects unsupported timing and client-controlled ownership', () => {
    expect(() => createFestivalReminderSchema.parse({ leadDays: 0 })).toThrow();
    expect(() => createFestivalReminderSchema.parse({ leadDays: 30 })).toThrow();
    expect(() =>
      createFestivalReminderSchema.parse({ leadDays: 1, userId: 'another-user' }),
    ).toThrow();
  });
});
