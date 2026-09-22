import {
  festivalCulturalGuideSchema,
  festivalDetailSchema,
  festivalDetailWithCultureSchema,
} from '@saraya/contracts';

import culturalGuideSeeds from '../../../../../../database/seeds/festival-cultural-guides.json';
import festivalSeeds from '../../../../../../database/seeds/festivals.json';

/**
 * Hackathon fixture boundary. The reproducible database seed is the canonical curated dataset;
 * parsing here prevents the mobile demo from maintaining an independent copy.
 */
const festivals = festivalDetailSchema.array().parse(festivalSeeds);
export const mockCulturalGuides = festivalCulturalGuideSchema.array().parse(culturalGuideSeeds);
const culturalGuideByFestivalId = new Map(
  mockCulturalGuides.map((guide) => [guide.festivalId, guide]),
);

if (
  culturalGuideByFestivalId.size !== festivals.length ||
  mockCulturalGuides.some(
    (guide) => !festivals.some((festival) => festival.id === guide.festivalId),
  )
) {
  throw new Error('Festival and cultural-guide fixtures must have a one-to-one ID mapping.');
}

export const mockFestivals = festivalDetailWithCultureSchema.array().parse(
  festivals.map((festival) => ({
    ...festival,
    culturalGuide: culturalGuideByFestivalId.get(festival.id),
  })),
);

export const festivalRegions = [...new Set(mockFestivals.map((item) => item.region))].sort();
