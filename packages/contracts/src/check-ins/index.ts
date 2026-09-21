import { z } from 'zod';

import { achievementSchema } from '../achievements';

export const checkInMoodSchema = z.enum(['calm', 'happy', 'brave', 'amazed', 'reflective']);

const companionsSchema = z.array(z.string().trim().min(1).max(40)).max(10);
const tagsSchema = z.array(z.string().trim().min(1).max(40)).max(10);

export const checkInSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  destinationId: z.string().min(1),
  visitedAt: z.string().datetime(),
  journalEntry: z.string().max(2000),
  mood: checkInMoodSchema.nullable(),
  companions: companionsSchema,
  tags: tagsSchema,
  photoUrl: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createCheckInSchema = z.object({
  destinationId: z.string().trim().min(1),
  visitedAt: z.string().datetime().optional(),
  journalEntry: z.string().trim().max(2000).default(''),
  mood: checkInMoodSchema.nullable().default(null),
  companions: companionsSchema.default([]),
  tags: tagsSchema.default([]),
  photoUrl: z.string().trim().min(1).nullable().default(null),
});

export const updateCheckInSchema = z
  .object({
    visitedAt: z.string().datetime().optional(),
    journalEntry: z.string().trim().max(2000).optional(),
    mood: checkInMoodSchema.nullable().optional(),
    companions: companionsSchema.optional(),
    tags: tagsSchema.optional(),
    photoUrl: z.string().trim().min(1).nullable().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Provide at least one check-in field to update.',
  });

export const journeyEntrySchema = checkInSchema.extend({
  destinationName: z.string().min(1),
  province: z.string().min(1),
  region: z.string().min(1),
  islandGroup: z.enum(['Luzon', 'Visayas', 'Mindanao']),
  destinationCategory: z.string().min(1),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
});

export const createCheckInResultSchema = z.object({
  checkIn: checkInSchema,
  newlyUnlockedAchievements: z.array(achievementSchema),
});

export const journeyStatisticsSchema = z.object({
  totalVisits: z.number().int().nonnegative(),
  uniqueDestinations: z.number().int().nonnegative(),
  islandGroupsVisited: z.number().int().nonnegative(),
  achievementsUnlocked: z.number().int().nonnegative(),
});

export const photoUploadResultSchema = z.object({ photoUrl: z.string().min(1) });

export type CheckInMood = z.infer<typeof checkInMoodSchema>;
export type CheckIn = z.infer<typeof checkInSchema>;
export type CreateCheckIn = z.infer<typeof createCheckInSchema>;
export type CreateCheckInInput = z.input<typeof createCheckInSchema>;
export type UpdateCheckIn = z.infer<typeof updateCheckInSchema>;
export type UpdateCheckInInput = z.input<typeof updateCheckInSchema>;
export type JourneyEntry = z.infer<typeof journeyEntrySchema>;
export type CreateCheckInResult = z.infer<typeof createCheckInResultSchema>;
export type JourneyStatistics = z.infer<typeof journeyStatisticsSchema>;
