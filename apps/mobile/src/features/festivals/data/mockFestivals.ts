import { festivalDetailSchema } from '@saraya/contracts';

import festivalSeeds from '../../../../../../database/seeds/festivals.json';

/**
 * Hackathon fixture boundary. The reproducible database seed is the canonical curated dataset;
 * parsing here prevents the mobile demo from maintaining an independent copy.
 */
export const mockFestivals = festivalDetailSchema.array().parse(festivalSeeds);

export const festivalRegions = [...new Set(mockFestivals.map((item) => item.region))].sort();
