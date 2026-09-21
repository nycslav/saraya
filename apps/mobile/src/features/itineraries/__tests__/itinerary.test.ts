import { tripPreferencesSchema, type GeneratedItinerary } from '@saraya/contracts';

import { ApiItineraryGateway } from '../services/adapters';

const preferences = tripPreferencesSchema.parse({
  destinationId: 'siargao',
  startingPoint: 'Sayak Airport',
  durationDays: 5,
  budget: 'Comfort',
  interests: ['Surfing', 'Local food'],
  pace: 'Balanced',
  accessibilityNeeds: 'Step-free options where possible',
});

const itinerary: GeneratedItinerary = {
  id: 'itinerary-1',
  destinationId: 'siargao',
  title: 'Five days in Siargao',
  subtitle: 'A balanced island itinerary',
  preferences,
  days: [
    {
      dayNumber: 1,
      title: 'Arrival and local orientation',
      stops: [
        {
          id: 'arrival',
          time: '9:00 AM',
          title: 'Arrival',
          detail: 'Transfer from the airport.',
          kind: 'transport',
        },
      ],
    },
  ],
  generatedAt: '2026-09-19T00:00:00.000Z',
};

describe('itinerary API gateway', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.saraya.test';
    globalThis.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
  });

  it('generates an itinerary through the API', async () => {
    jest.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: async () => itinerary,
    } as Response);

    await expect(new ApiItineraryGateway().generate(preferences)).resolves.toEqual(itinerary);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.saraya.test/itineraries/generate',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(preferences) }),
    );
  });

  it('saves an itinerary through the API', async () => {
    jest.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    await expect(new ApiItineraryGateway().save(itinerary)).resolves.toBeUndefined();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.saraya.test/itineraries',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(itinerary) }),
    );
  });

  it('rejects invalid preferences before an API call is made', () => {
    expect(() => tripPreferencesSchema.parse({ ...preferences, interests: [] })).toThrow();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
