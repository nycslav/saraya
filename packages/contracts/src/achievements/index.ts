import { z } from 'zod';

export const achievementCategorySchema = z.enum(['exploration', 'food', 'culture', 'nature']);
export const achievementRuleTypeSchema = z.enum([
  'total_visits',
  'destination_category',
  'island_group',
  'distinct_island_groups',
]);

export const achievementSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().min(1),
  category: achievementCategorySchema,
  ruleType: achievementRuleTypeSchema,
  threshold: z.number().int().positive(),
  destinationCategory: z.string().nullable(),
  islandGroup: z.string().nullable(),
});

export const achievementProgressSchema = achievementSchema.extend({
  progress: z.number().int().nonnegative(),
  isUnlocked: z.boolean(),
  unlockedAt: z.string().datetime().nullable(),
});

export const userAchievementSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  achievementId: z.string().min(1),
  unlockedAt: z.string().datetime(),
  checkInId: z.string().nullable(),
});

export type Achievement = z.infer<typeof achievementSchema>;
export type AchievementProgress = z.infer<typeof achievementProgressSchema>;
export type UserAchievement = z.infer<typeof userAchievementSchema>;
