import type { PlaceCandidate } from '../src/integrations/places/places.provider';
import {
  addVerifiedPlaces,
  removeUnknownCandidateIds,
} from '../src/modules/itineraries/itinerary-place-matcher';
import { itineraryPlanSchema } from '../src/modules/itineraries/itinerary.plan';

const candidates: PlaceCandidate[] = [
  {
    provider: 'geoapify',
    id: 'restaurant-1',
    name: 'Island Kitchen',
    category: 'catering restaurant',
    address: 'Tourism Road',
    coordinates: { latitude: 9.79, longitude: 126.16 },
  },
  {
    provider: 'geoapify',
    id: 'hotel-1',
    name: 'Coast Hotel',
    category: 'accommodation hotel',
    address: 'Cloud 9 Road',
    coordinates: { latitude: 9.8, longitude: 126.17 },
  },
  {
    provider: 'geoapify',
    id: 'attraction-1',
    name: 'Island Museum',
    category: 'entertainment museum',
    address: 'General Luna',
    coordinates: { latitude: 9.81, longitude: 126.18 },
  },
];

const plan = itineraryPlanSchema.parse({
  title: 'Siargao plan',
  subtitle: 'Verified local places',
  days: [{
    dayNumber: 1,
    title: 'Arrival day',
    stops: [
      { time: '9:00 AM', candidateId: null, title: 'Transfer', detail: 'Travel safely.', kind: 'transport' },
      { time: '10:00 AM', candidateId: null, title: 'Local activity', detail: 'Explore locally.', kind: 'activity' },
      { time: '1:00 PM', candidateId: null, title: 'Local lunch', detail: 'Try local food.', kind: 'meal' },
      { time: '5:00 PM', candidateId: null, title: 'Accommodation', detail: 'Rest for the day.', kind: 'stay' },
    ],
  }],
});

describe('addVerifiedPlaces', () => {
  it('matches verified candidates to the correct stop kinds', () => {
    const result = addVerifiedPlaces(plan, candidates, new Set(['activity', 'meal', 'stay']));

    expect(result.days[0]?.stops.map(({ candidateId }) => candidateId)).toEqual([
      null,
      'attraction-1',
      'restaurant-1',
      'hotel-1',
    ]);
  });

  it('can conservatively enrich only meals and stays in AI plans', () => {
    const result = addVerifiedPlaces(plan, candidates, new Set(['meal', 'stay']));

    expect(result.days[0]?.stops[1]?.candidateId).toBeNull();
    expect(result.days[0]?.stops[2]?.candidateId).toBe('restaurant-1');
    expect(result.days[0]?.stops[3]?.candidateId).toBe('hotel-1');
  });

  it('neutralizes unknown AI place references without discarding the plan', () => {
    const unsafePlan = itineraryPlanSchema.parse({
      ...plan,
      days: [{
        ...plan.days[0],
        stops: [{
          time: '1:00 PM',
          candidateId: 'invented-restaurant',
          title: 'Invented Restaurant',
          detail: 'A claim about an unverified business.',
          kind: 'meal',
        }],
      }],
    });

    const result = removeUnknownCandidateIds(unsafePlan, candidates);

    expect(result.removedIds).toEqual(['invented-restaurant']);
    expect(result.plan.days[0]?.stops[0]).toEqual({
      time: '1:00 PM',
      candidateId: null,
      title: 'Local meal',
      detail: 'Confirm a suitable current local option before visiting.',
      kind: 'meal',
    });
  });
});
