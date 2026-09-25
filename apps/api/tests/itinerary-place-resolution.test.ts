import type { DestinationDetail, GeneratedItinerary, TripPreferences } from '@saraya/contracts';

import type { PlaceCandidate, PlacesProvider } from '../src/integrations/places/places.provider';
import type { DestinationRepository } from '../src/modules/destinations/destination.repository';
import type { ItineraryGenerator } from '../src/modules/itineraries/itinerary.generator';
import type { ItineraryRepository } from '../src/modules/itineraries/itinerary.repository';
import { ItineraryService } from '../src/modules/itineraries/itinerary.service';

const destination: DestinationDetail = {
  id: 'siargao',
  name: 'Siargao',
  province: 'Surigao del Norte',
  region: 'Caraga',
  islandGroup: 'Mindanao',
  category: 'Beach',
  rating: 4.9,
  summary: 'A first sentence. A second sentence.',
  heroTone: 'lagoon',
  tags: ['Surfing'],
  description: 'A destination description.',
  highlights: ['Cloud 9'],
  bestFor: ['Surfing'],
  coordinates: { latitude: 9.8482, longitude: 126.0458 },
  culturalGuide: {
    historicalContext: 'Local context.',
    etiquette: ['Respect local guidance.'],
    localPhrase: 'Salamat.',
  },
};

const candidate: PlaceCandidate = {
  provider: 'geoapify',
  id: 'restaurant-1',
  name: 'Verified Island Kitchen',
  category: 'catering restaurant',
  address: 'Tourism Road, General Luna',
  coordinates: { latitude: 9.79, longitude: 126.16 },
};

const hotelCandidate: PlaceCandidate = {
  provider: 'geoapify',
  id: 'hotel-1',
  name: 'Verified Coast Hotel',
  category: 'accommodation hotel',
  address: 'Cloud 9 Road, General Luna',
  coordinates: { latitude: 9.8, longitude: 126.17 },
};

const preferences: TripPreferences = {
  destinationId: 'siargao',
  startingPoint: 'Sayak Airport',
  durationDays: 1,
  budget: 'Comfort',
  interests: ['Local food'],
  pace: 'Balanced',
  accessibilityNeeds: '',
};

describe('ItineraryService place resolution', () => {
  it('replaces AI labels with the verified candidate and exposes its reference', async () => {
    const destinations: DestinationRepository = {
      findAll: jest.fn(),
      findById: jest.fn().mockResolvedValue(destination),
    };
    const generator: ItineraryGenerator = {
      generate: jest.fn().mockResolvedValue({
        source: 'gemini',
        plan: {
          title: 'Specific Siargao',
          subtitle: 'Verified places',
          days: [{
            dayNumber: 1,
            title: 'Food and coast',
            stops: [{
              time: '12:00 PM',
              candidateId: candidate.id,
              title: 'AI-provided label is ignored',
              detail: 'Try a local specialty and verify current opening hours.',
              kind: 'meal',
            }],
          }],
        },
      }),
    };
    const itineraries: ItineraryRepository = {
      save: jest.fn(),
      findById: jest.fn<Promise<GeneratedItinerary | null>, [string]>(),
    };
    const places: PlacesProvider = {
      findNearby: jest.fn().mockResolvedValue([candidate]),
    };

    const result = await new ItineraryService(
      destinations,
      generator,
      itineraries,
      places,
    ).generate(preferences);

    expect(result.days[0]?.stops[0]).toEqual(expect.objectContaining({
      title: 'Verified Island Kitchen',
      place: candidate,
    }));
    expect(result.days[0]?.stops[0]?.detail).toContain(candidate.address);
  });

  it('fills a generic AI stay with a matching verified place', async () => {
    const destinations: DestinationRepository = {
      findAll: jest.fn(),
      findById: jest.fn().mockResolvedValue(destination),
    };
    const generator: ItineraryGenerator = {
      generate: jest.fn().mockResolvedValue({
        source: 'gemini',
        plan: {
          title: 'Specific Siargao',
          subtitle: 'Verified places',
          days: [{
            dayNumber: 1,
            title: 'Arrival day',
            stops: [{
              time: '5:00 PM',
              candidateId: null,
              title: 'Accommodation area',
              detail: 'Check in and rest after the transfer.',
              kind: 'stay',
            }],
          }],
        },
      }),
    };
    const itineraries: ItineraryRepository = {
      save: jest.fn(),
      findById: jest.fn<Promise<GeneratedItinerary | null>, [string]>(),
    };
    const places: PlacesProvider = {
      findNearby: jest.fn().mockResolvedValue([hotelCandidate]),
    };

    const result = await new ItineraryService(destinations, generator, itineraries, places)
      .generate(preferences);

    expect(result.days[0]?.stops[0]).toEqual(expect.objectContaining({
      title: 'Verified Coast Hotel',
      place: hotelCandidate,
    }));
  });
});
