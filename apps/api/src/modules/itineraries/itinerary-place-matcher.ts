import type { PlaceCandidate } from '../../integrations/places/places.provider';
import type { ItineraryPlan } from './itinerary.plan';

type PlaceStopKind = 'activity' | 'meal' | 'stay';

export function describeCandidateUse(candidate: PlaceCandidate): PlaceStopKind {
  if (candidate.category.startsWith('catering ')) return 'meal';
  if (candidate.category.startsWith('accommodation ')) return 'stay';
  return 'activity';
}

export function aliasPlaceCandidates(candidates: PlaceCandidate[]) {
  const aliases = new Map<string, string>();
  const promptCandidates = candidates.map(({ id, ...candidate }, index) => {
    const candidateId = `p${index + 1}`;
    aliases.set(candidateId, id);
    return {
      ...candidate,
      candidateId,
      suitableFor: describeCandidateUse({ id, ...candidate }),
    };
  });

  return { aliases, promptCandidates };
}

export function resolvePlaceCandidateAliases(
  plan: ItineraryPlan,
  aliases: ReadonlyMap<string, string>,
): ItineraryPlan {
  return {
    ...plan,
    days: plan.days.map((day) => ({
      ...day,
      stops: day.stops.map((stop) => ({
        ...stop,
        candidateId: stop.candidateId
          ? aliases.get(stop.candidateId) ?? stop.candidateId
          : null,
      })),
    })),
  };
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
          };
        }),
      })),
    },
    removedIds,
  };
}
