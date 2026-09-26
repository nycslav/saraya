import {
  festivalCulturalGuideSchema,
  festivalDetailSchema,
  festivalDetailWithCultureSchema,
  festivalSummarySchema,
} from '@saraya/contracts';

import culturalGuides from '../../../database/seeds/festival-cultural-guides.json';
import festivals from '../../../database/seeds/festivals.json';
import { createApiClient } from './index';

const festival = festivalDetailSchema.parse(festivals[0]);
const culturalGuide = festivalCulturalGuideSchema.parse(
  culturalGuides.find((guide) => guide.festivalId === festival.id),
);
const detail = festivalDetailWithCultureSchema.parse({ ...festival, culturalGuide });
const summary = festivalSummarySchema.parse(festival);
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

describe('festival API client', () => {
  afterEach(() => jest.restoreAllMocks());

  it('constructs list and upcoming query strings and validates summaries', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json([summary]))
      .mockResolvedValueOnce(Response.json([summary]));
    const client = createApiClient('https://api.saraya.test/');

    await expect(
      client.festivals.list({ search: 'Ati Atihan', region: 'Western Visayas', month: 1 }),
    ).resolves.toEqual([summary]);
    await expect(client.festivals.upcoming({ month: 1 })).resolves.toEqual([summary]);

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://api.saraya.test/festivals?search=Ati+Atihan&region=Western+Visayas&month=1',
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'https://api.saraya.test/festivals/upcoming?month=1',
    );
  });

  it('encodes IDs and validates detail responses', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(detail));
    await expect(createApiClient('https://api.saraya.test').festivals.getById(festival.id)).resolves.toEqual(
      detail,
    );
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `https://api.saraya.test/festivals/${festival.id}`,
    );
  });

  it('rejects contract-invalid server responses', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json([{ id: 'incomplete' }]));
    await expect(createApiClient('https://api.saraya.test').festivals.list()).rejects.toThrow();
  });

  it('constructs authenticated reminder create, status, cancel, and list requests', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json(reminder, { status: 201 }))
      .mockResolvedValueOnce(Response.json(reminder))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json([reminder]));
    const client = createApiClient('https://api.saraya.test', async () => 'access-token');

    await expect(client.festivals.createReminder('masskara')).resolves.toEqual(reminder);
    await expect(client.festivals.getReminder('masskara')).resolves.toEqual(reminder);
    await expect(client.festivals.cancelReminder('masskara')).resolves.toBeUndefined();
    await expect(client.festivals.listReminders()).resolves.toEqual([reminder]);

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://api.saraya.test/festivals/masskara/reminder',
      'https://api.saraya.test/festivals/masskara/reminder',
      'https://api.saraya.test/festivals/masskara/reminder',
      'https://api.saraya.test/festival-reminders',
    ]);
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ leadDays: 1 }),
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
      }),
    );
    expect(fetchMock.mock.calls[2]?.[1]).toEqual(
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('surfaces reminder authentication errors', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json(
        { error: { message: 'Sign in to manage notifications.' } },
        { status: 401 },
      ),
    );
    await expect(
      createApiClient('https://api.saraya.test').festivals.getReminder('masskara'),
    ).rejects.toMatchObject({ status: 401, message: 'Sign in to manage notifications.' });
  });
});
