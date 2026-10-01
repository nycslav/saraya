import {
  festivalCulturalGuideSchema,
  festivalDetailSchema,
  festivalDetailWithCultureSchema,
  type FestivalCulturalGuide,
  type FestivalDetail,
  type FestivalDetailWithCulture,
} from '@saraya/contracts';
import { z } from 'zod';

import culturalGuideData from '../../../../../database/seeds/festival-cultural-guides.json';
import festivalData from '../../../../../database/seeds/festivals.json';

export const seedFestivalDetails: FestivalDetail[] = z
  .array(festivalDetailSchema)
  .parse(festivalData);
export const seedFestivalCulturalGuides: FestivalCulturalGuide[] = z
  .array(festivalCulturalGuideSchema)
  .parse(culturalGuideData);

const festivalIds = new Set(seedFestivalDetails.map(({ id }) => id));
const guideByFestivalId = new Map(
  seedFestivalCulturalGuides.map((guide) => [guide.festivalId, guide]),
);

if (
  festivalIds.size !== seedFestivalDetails.length ||
  guideByFestivalId.size !== seedFestivalCulturalGuides.length ||
  seedFestivalDetails.length !== seedFestivalCulturalGuides.length ||
  seedFestivalCulturalGuides.some(({ festivalId }) => !festivalIds.has(festivalId))
) {
  throw new Error('Festival seeds require unique, one-to-one festival and cultural-guide IDs.');
}

export const seedFestivals: FestivalDetailWithCulture[] = z
  .array(festivalDetailWithCultureSchema)
  .parse(
    seedFestivalDetails.map((festival) => ({
      ...festival,
      culturalGuide: guideByFestivalId.get(festival.id),
    })),
  );
