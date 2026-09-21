import type { DestinationDetail, TripPreferences } from '@saraya/contracts';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

import '../../platform/config/load-env';
import type {
  ItineraryGenerationResult,
  ItineraryGenerator,
} from '../../modules/itineraries/itinerary.generator';
import { itineraryPlanSchema } from '../../modules/itineraries/itinerary.plan';
import type { PlaceCandidate } from '../places/places.provider';

export class OpenAiItineraryGenerator implements ItineraryGenerator {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.model = process.env.OPENAI_MODEL ?? 'gpt-5-mini';
  }

  async generate(
    preferences: TripPreferences,
    destination: DestinationDetail,
    candidates: PlaceCandidate[],
  ): Promise<ItineraryGenerationResult> {
    if (candidates.length === 0) {
      throw new Error('No verified place candidates are available for AI itinerary generation.');
    }

    const response = await this.client.responses.parse({
      model: this.model,
      instructions: [
        'You create practical, culturally respectful Philippine travel itineraries.',
        'Return exactly the requested number of sequential days, beginning with day 1.',
        'Use realistic daily pacing and include transport, activities, meals, and rest where useful.',
        'For a real establishment or attraction, set candidateId to one of the supplied place candidate IDs.',
        'Never create, alter, or guess a candidate ID or establishment name.',
        'Use candidateId null only for generic transfers, rest, or activities with no suitable candidate.',
        'When candidateId is present, use a short generic title because the backend replaces it with the verified place name.',
        'Never invent safety guarantees, schedules, prices, opening hours, or accessibility claims.',
        'Mention that travelers should verify time-sensitive arrangements in a stop detail when relevant.',
      ].join(' '),
      input: JSON.stringify({
        destination: {
          name: destination.name,
          province: destination.province,
          region: destination.region,
          summary: destination.summary,
          highlights: destination.highlights,
          culturalContext: destination.culturalGuide.historicalContext,
          etiquette: destination.culturalGuide.etiquette,
        },
        preferences,
        placeCandidates: candidates,
      }),
      text: {
        format: zodTextFormat(itineraryPlanSchema, 'philippine_trip_itinerary'),
      },
    });

    if (response.status !== 'completed' || !response.output_parsed) {
      throw new Error(`OpenAI itinerary generation ended with status ${response.status}.`);
    }

    return {
      plan: itineraryPlanSchema.parse(response.output_parsed),
      source: 'openai',
    };
  }
}
