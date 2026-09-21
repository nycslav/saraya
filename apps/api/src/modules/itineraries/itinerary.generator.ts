import type {
  DestinationDetail,
  ItineraryGenerationSource,
  TripPreferences,
} from '@saraya/contracts';

import { GeminiItineraryGenerator } from '../../integrations/gemini/gemini-itinerary.generator';
import { OpenAiItineraryGenerator } from '../../integrations/openai/openai-itinerary.generator';
import type { PlaceCandidate } from '../../integrations/places/places.provider';
import { itineraryPlanSchema, type ItineraryPlan } from './itinerary.plan';

export interface ItineraryGenerator {
  generate(
    preferences: TripPreferences,
    destination: DestinationDetail,
    candidates: PlaceCandidate[],
  ): Promise<ItineraryGenerationResult>;
}

export interface ItineraryGenerationResult {
  plan: ItineraryPlan;
  source: ItineraryGenerationSource;
}

export class DeterministicItineraryGenerator implements ItineraryGenerator {
  async generate(
    preferences: TripPreferences,
    destination: DestinationDetail,
    _candidates: PlaceCandidate[],
  ): Promise<ItineraryGenerationResult> {
    const days = Array.from({ length: preferences.durationDays }, (_, dayIndex) => {
      const primary =
        destination.highlights[dayIndex % destination.highlights.length] ?? destination.name;
      const secondary =
        destination.highlights[(dayIndex + 1) % destination.highlights.length] ??
        'the local community';

      return {
        dayNumber: dayIndex + 1,
        title: dayIndex === 0 ? `Welcome to ${destination.name}` : `${primary} and local stories`,
        stops: [
          {
            time: '7:30 AM',
            candidateId: null,
            title: `${preferences.startingPoint} departure`,
            detail: `${preferences.pace} pace with realistic transfer time.`,
            kind: 'transport' as const,
          },
          {
            time: '10:00 AM',
            candidateId: null,
            title: primary,
            detail: `A community-aware visit shaped around ${preferences.interests.join(', ')}.`,
            kind: 'activity' as const,
          },
          {
            time: '1:00 PM',
            candidateId: null,
            title: 'Local lunch',
            detail: `${preferences.budget} dining with time to ask about local specialties.`,
            kind: 'meal' as const,
          },
          {
            time: '5:30 PM',
            candidateId: null,
            title: `${secondary} area stay`,
            detail: preferences.accessibilityNeeds || 'Rest and prepare for the following day.',
            kind: 'stay' as const,
          },
        ],
      };
    });

    return {
      plan: itineraryPlanSchema.parse({
        title: `${destination.name}: ${destination.tags.slice(0, 3).join(', ')}`,
        subtitle: `${preferences.durationDays} days | ${preferences.budget} | ${preferences.pace}`,
        days,
      }),
      source: 'deterministic',
    };
  }
}

class ResilientItineraryGenerator implements ItineraryGenerator {
  constructor(
    private readonly primary: ItineraryGenerator,
    private readonly fallback: ItineraryGenerator,
  ) {}

  async generate(
    preferences: TripPreferences,
    destination: DestinationDetail,
    candidates: PlaceCandidate[],
  ): Promise<ItineraryGenerationResult> {
    try {
      const result = await this.primary.generate(preferences, destination, candidates);
      assertKnownCandidateIds(result.plan, candidates);
      return result;
    } catch (error) {
      console.warn('AI itinerary generation failed; using the deterministic fallback.', error);
      return this.fallback.generate(preferences, destination, candidates);
    }
  }
}

function assertKnownCandidateIds(plan: ItineraryPlan, candidates: PlaceCandidate[]) {
  const candidateIds = new Set(candidates.map(({ id }) => id));
  const unknownId = plan.days
    .flatMap(({ stops }) => stops)
    .map(({ candidateId }) => candidateId)
    .find((candidateId) => candidateId !== null && !candidateIds.has(candidateId));

  if (unknownId) {
    throw new Error(`AI itinerary referenced an unknown place candidate: ${unknownId}`);
  }
}

export function createItineraryGenerator(): ItineraryGenerator {
  const fallback = new DeterministicItineraryGenerator();

  if (process.env.NODE_ENV === 'test' || process.env.ITINERARY_GENERATOR === 'deterministic') {
    return fallback;
  }

  const provider = process.env.AI_PROVIDER?.toLowerCase();

  if (
    (provider === 'gemini' || (!provider && process.env.GEMINI_API_KEY)) &&
    process.env.GEMINI_API_KEY
  ) {
    return new ResilientItineraryGenerator(new GeminiItineraryGenerator(), fallback);
  }

  if (
    (provider === 'openai' || (!provider && process.env.OPENAI_API_KEY)) &&
    process.env.OPENAI_API_KEY
  ) {
    return new ResilientItineraryGenerator(new OpenAiItineraryGenerator(), fallback);
  }

  return fallback;
}
