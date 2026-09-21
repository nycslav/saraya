import { z } from 'zod';

export const itineraryPlanSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().min(1),
  days: z.array(
    z.object({
      dayNumber: z.number().int().positive(),
      title: z.string().min(1),
      stops: z.array(
        z.object({
          time: z.string().min(1),
          candidateId: z.string().min(1).nullable(),
          title: z.string().min(1),
          detail: z.string().min(1),
          kind: z.enum(['transport', 'activity', 'meal', 'stay']),
        }),
      ).min(1),
    }),
  ).min(1),
});

export type ItineraryPlan = z.infer<typeof itineraryPlanSchema>;
