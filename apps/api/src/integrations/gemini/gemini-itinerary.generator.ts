import type { DestinationDetail, TripPreferences } from '@saraya/contracts';
import { z } from 'zod';

import '../../platform/config/load-env';
import type {
  ItineraryGenerationResult,
  ItineraryGenerator,
} from '../../modules/itineraries/itinerary.generator';
import {
  aliasPlaceCandidates,
  resolvePlaceCandidateAliases,
} from '../../modules/itineraries/itinerary-place-matcher';
import { itineraryPlanSchema } from '../../modules/itineraries/itinerary.plan';
import type { PlaceCandidate } from '../places/places.provider';

export class GeminiItineraryGenerator implements ItineraryGenerator {
  private readonly apiKey: string | undefined;
  private readonly model: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.model = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash';
  }

  async generate(
    preferences: TripPreferences,
    destination: DestinationDetail,
    candidates: PlaceCandidate[],
  ): Promise<ItineraryGenerationResult> {
    if (candidates.length === 0) {
      throw new Error('No verified place candidates are available for AI itinerary generation.');
    }

    const { aliases, promptCandidates } = aliasPlaceCandidates(candidates);

    const { GoogleGenAI } = await import('@google/genai');
    const client = new GoogleGenAI({ apiKey: this.apiKey });
    const response = await client.models.generateContent({
      model: this.model,
      contents: JSON.stringify({
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
        placeCandidates: promptCandidates,
      }),
      config: {
        systemInstruction: [
          'You create practical, culturally respectful Philippine travel itineraries.',
          'Return exactly the requested number of sequential days, beginning with day 1.',
          'Use realistic daily pacing and include transport, activities, meals, and rest where useful.',
          'Create four to six chronologically ordered stops per full day; arrival and departure days may contain fewer stops.',
          'When matching candidates are supplied, include at least one verified meal and one verified stay per applicable day.',
          'Prefer distinct candidate IDs across the itinerary and repeat a place only when choices are limited.',
          'Match meal stops only to candidates marked suitableFor meal, stays only to stay, and attractions only to activity.',
          'Copy the short candidateId alias exactly as supplied, such as p1. Never use or construct provider place IDs.',
          'A destination highlight is allowed without a place candidate: use candidateId null and keep a specific descriptive activity title.',
          'Use the traveler budget, pace, interests, accessibility notes, and starting point in concrete stop details.',
          'For a real establishment or attraction, set candidateId to one of the supplied place candidate IDs.',
          'Never create, alter, or guess a candidate ID or establishment name.',
          'Use candidateId null only for generic transfers, rest, or activities with no suitable candidate.',
          'When candidateId is present, use a short generic title because the backend replaces it with the verified place name.',
          'Never invent safety guarantees, schedules, prices, opening hours, or accessibility claims.',
          'Mention that travelers should verify time-sensitive arrangements in a stop detail when relevant.',
        ].join(' '),
        responseMimeType: 'application/json',
        responseJsonSchema: z.toJSONSchema(itineraryPlanSchema),
      },
    });

    if (!response.text) {
      throw new Error('Gemini itinerary generation returned no text.');
    }

    return {
      plan: resolvePlaceCandidateAliases(
        itineraryPlanSchema.parse(JSON.parse(response.text)),
        aliases,
      ),
      source: 'gemini',
    };
  }
}
