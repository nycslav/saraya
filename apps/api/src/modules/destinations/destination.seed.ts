import {
  destinationCategorySchema,
  destinationDetailSchema,
  islandGroupSchema,
  type DestinationDetail,
} from '@saraya/contracts';
import { z } from 'zod';

import destinationSeedData from '../../../../../database/seeds/destinations.json';

const destinationSeedSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  province: z.string().min(1),
  category: destinationCategorySchema,
  rating: z.number().min(0).max(5),
  summary: z.string().min(1).refine(
    (summary) => (summary.match(/[.!?](?=\s|$)/g) ?? []).length === 2,
    'Destination summaries must contain exactly two sentences.',
  ),
  thumbnailImageUrl: z.string().url().optional(),
  heroTone: z.enum(['sky', 'sunset', 'forest', 'lagoon', 'violet', 'gold']),
  tags: z.array(z.string().min(1)).min(1),
  coordinates: z.tuple([
    z.number().min(-90).max(90),
    z.number().min(-180).max(180),
  ]),
  highlights: z.array(z.string().min(1)).min(1),
});

const destinationRegionSchema = z.object({
  region: z.string().min(1),
  islandGroup: islandGroupSchema,
  phrase: z.string().min(1),
  destinations: z.array(destinationSeedSchema).min(1),
});

const regionSeeds = z.array(destinationRegionSchema).min(1).parse(destinationSeedData);
const seeds = regionSeeds.flatMap(({ region, islandGroup, phrase, destinations }) =>
  destinations.map((destination) => ({ ...destination, region, islandGroup, phrase })),
);

if (seeds.length < 50) {
  throw new Error('The destination catalog must contain at least 50 destinations.');
}

if (new Set(seeds.map(({ id }) => id)).size !== seeds.length) {
  throw new Error('Destination IDs must be unique.');
}

export const seedDestinations: DestinationDetail[] = seeds.map((seed) =>
  destinationDetailSchema.parse({
    id: seed.id,
    name: seed.name,
    province: seed.province,
    region: seed.region,
    islandGroup: seed.islandGroup,
    category: seed.category,
    rating: seed.rating,
    summary: seed.summary,
    thumbnailImageUrl: seed.thumbnailImageUrl,
    heroTone: seed.heroTone,
    tags: seed.tags,
    coordinates: { latitude: seed.coordinates[0], longitude: seed.coordinates[1] },
    description: `${seed.summary} Saraya combines considerate pacing, practical routing, and local context so travelers can explore with confidence.`,
    highlights: seed.highlights,
    bestFor: seed.tags,
    culturalGuide: {
      historicalContext: `Travel here is shaped by the people, landscapes, and living traditions of ${seed.region}. Choose community-led experiences and follow local guidance.`,
      etiquette: [
        'Ask before photographing people, homes, or ceremonies.',
        'Use accredited local guides where required.',
        'Carry out waste and respect protected areas.',
      ],
      localPhrase: seed.phrase,
    },
  }),
);
