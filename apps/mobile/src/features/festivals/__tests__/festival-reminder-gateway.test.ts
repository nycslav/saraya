import { sessionStore } from '@/features/auth/sessionStore';

import {
  ApiFestivalReminderGateway,
  FixtureFestivalReminderGateway,
} from '../reminder-gateways';

jest.mock('@/features/auth/sessionStore', () => ({
  sessionStore: { read: jest.fn() },
}));

const mockRead = sessionStore.read as jest.Mock;
const reminder = {
  id: '00000000-0000-4000-8000-000000000001',
  festivalId: 'masskara',
  leadDays: 1 as const,
  remindAt: '2026-09-30T01:00:00.000Z',
  status: 'active' as const,
  sentAt: null,
  createdAt: '2026-09-20T00:00:00.000Z',
  updatedAt: '2026-09-20T00:00:00.000Z',
};

describe('festival reminder gateways', () => {
  const originalUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.saraya.test';
    mockRead.mockResolvedValue({ accessToken: 'token', refreshToken: 'refresh' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env.EXPO_PUBLIC_API_BASE_URL = originalUrl;
  });

  it('creates, retrieves, and cancels through the authenticated typed client', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json(reminder, { status: 201 }))
      .mockResolvedValueOnce(Response.json(reminder))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const gateway = new ApiFestivalReminderGateway();

    await expect(gateway.create('masskara')).resolves.toEqual(reminder);
    await expect(gateway.get('masskara')).resolves.toEqual(reminder);
    await expect(gateway.cancel('masskara')).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token' }) }),
    );
  });

  it('propagates API and signed-out authentication failures', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        Response.json({ error: { message: 'Database unavailable.' } }, { status: 503 }),
      )
      .mockResolvedValueOnce(
        Response.json({ error: { message: 'Sign in required.' } }, { status: 401 }),
      );
    const gateway = new ApiFestivalReminderGateway();

    await expect(gateway.get('masskara')).rejects.toThrow('Database unavailable.');
    mockRead.mockResolvedValue(null);
    await expect(gateway.get('masskara')).rejects.toMatchObject({ status: 401 });
  });

  it('keeps fixture reminders deterministic and cancellable', async () => {
    const gateway = new FixtureFestivalReminderGateway();
    await expect(gateway.get('masskara')).resolves.toBeNull();
    await expect(gateway.create('masskara')).resolves.toEqual(
      expect.objectContaining({ festivalId: 'masskara', status: 'active' }),
    );
    await gateway.cancel('masskara');
    await expect(gateway.get('masskara')).resolves.toBeNull();
  });
});
