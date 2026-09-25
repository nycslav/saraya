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
});
