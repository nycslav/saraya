import { generatedItinerarySchema } from '@saraya/contracts';

import { PostgresItineraryRepository } from '../src/modules/itineraries/itinerary.postgres-repository';

const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockConnect = jest.fn(() => ({ query: mockQuery, release: mockRelease }));

jest.mock('../src/platform/database/pool', () => ({
  getPool: () => ({ connect: mockConnect }),
}));

const itinerary = generatedItinerarySchema.parse({
  id: 'itinerary-1',
  destinationId: 'siargao',
  generationSource: 'gemini',
  title: 'Siargao sample',
  subtitle: 'One day sample',
  preferences: {
    destinationId: 'siargao',
    startingPoint: 'Sayak Airport',
    durationDays: 1,
    budget: 'Comfort',
    interests: ['Surfing'],
    pace: 'Balanced',
    accessibilityNeeds: '',
  },
  days: [
    {
      dayNumber: 1,
      title: 'Arrival day',
      stops: [
        {
          id: 'day-1-stop-1',
          time: '9:00 AM',
          title: 'Airport transfer',
          detail: 'Travel to the accommodation.',
          kind: 'transport',
        },
      ],
    },
  ],
  generatedAt: '2026-09-18T00:00:00.000Z',
});

describe('PostgresItineraryRepository', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    mockConnect.mockClear();
    mockRelease.mockClear();
  });

  it('saves itinerary metadata, days, and stops in one transaction', async () => {
    await new PostgresItineraryRepository().save(itinerary);

    expect(mockQuery.mock.calls[0]?.[0]).toBe('BEGIN');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO itineraries'),
      expect.arrayContaining(['itinerary-1', 'siargao', 'gemini']),
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO itinerary_days'),
      ['itinerary-1', 1, 'Arrival day'],
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO itinerary_stops'),
      [
        'itinerary-1',
        1,
        'day-1-stop-1',
        '9:00 AM',
        'Airport transfer',
        'Travel to the accommodation.',
        'transport',
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ],
    );
    expect(mockQuery.mock.calls.at(-1)?.[0]).toBe('COMMIT');
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });
});
