import type { PlaceCandidate } from '../../integrations/places/places.provider';
import type { ItineraryPlan } from './itinerary.plan';

type PlaceStopKind = 'activity' | 'meal' | 'stay';

export function describeCandidateUse(candidate: PlaceCandidate): PlaceStopKind {
  if (candidate.category.startsWith('catering ')) return 'meal';
  if (candidate.category.startsWith('accommodation ')) return 'stay';
  return 'activity';
}

export function addVerifiedPlaces(
  plan: ItineraryPlan,
  candidates: PlaceCandidate[],
  eligibleKinds: ReadonlySet<PlaceStopKind>,
): ItineraryPlan {
  const reservedIds = new Set(plan.days.flatMap(({ stops }) =>
    stops.flatMap(({ candidateId }) => candidateId ? [candidateId] : []),
  ));
  const assignedIds = new Set(reservedIds);

  return {
    ...plan,
    days: plan.days.map((day) => ({
      ...day,
      stops: day.stops.map((stop) => {
        if (stop.candidateId || stop.kind === 'transport' || !eligibleKinds.has(stop.kind)) {
          return stop;
        }

        const matching = candidates.filter((candidate) => describeCandidateUse(candidate) === stop.kind);
        const candidate = matching.find(({ id }) => !assignedIds.has(id)) ?? matching[0];
        if (!candidate) return stop;

        assignedIds.add(candidate.id);
        return { ...stop, candidateId: candidate.id };
      }),
    })),
  };
}

export function removeUnknownCandidateIds(
  plan: ItineraryPlan,
  candidates: PlaceCandidate[],
): { plan: ItineraryPlan; removedIds: string[] } {
  const knownIds = new Set(candidates.map(({ id }) => id));
  const removedIds: string[] = [];
  const genericTitles = {
    transport: 'Local transfer',
    activity: 'Local activity',
    meal: 'Local meal',
    stay: 'Accommodation',
  } as const;

  return {
    plan: {
      ...plan,
      days: plan.days.map((day) => ({
        ...day,
        stops: day.stops.map((stop) => {
          if (!stop.candidateId || knownIds.has(stop.candidateId)) return stop;

          removedIds.push(stop.candidateId);
          return {
            ...stop,
            candidateId: null,
            title: genericTitles[stop.kind],
            detail: 'Confirm a suitable current local option before visiting.',
          };
        }),
      })),
    },
    removedIds,
  };
}
