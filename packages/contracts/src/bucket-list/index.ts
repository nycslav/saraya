import { z } from 'zod';

export const bucketListPrioritySchema = z.enum(['low', 'medium', 'high']);
export const bucketListStatusSchema = z.enum(['planned', 'visited', 'skipped']);

export const bucketListItemSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  destinationId: z.string().min(1),
  priority: bucketListPrioritySchema,
  personalNotes: z.string().max(500),
  status: bucketListStatusSchema,
  addedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createBucketListItemSchema = z.object({
  destinationId: z.string().trim().min(1),
  priority: bucketListPrioritySchema.default('medium'),
  personalNotes: z.string().trim().max(500).default(''),
  status: bucketListStatusSchema.default('planned'),
});

export const updateBucketListItemSchema = z
  .object({
    priority: bucketListPrioritySchema.optional(),
    personalNotes: z.string().trim().max(500).optional(),
    status: bucketListStatusSchema.optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Provide at least one bucket-list field to update.',
  });

export type BucketListPriority = z.infer<typeof bucketListPrioritySchema>;
export type BucketListStatus = z.infer<typeof bucketListStatusSchema>;
export type BucketListItem = z.infer<typeof bucketListItemSchema>;
export type CreateBucketListItem = z.infer<typeof createBucketListItemSchema>;
export type CreateBucketListItemInput = z.input<typeof createBucketListItemSchema>;
export type UpdateBucketListItem = z.infer<typeof updateBucketListItemSchema>;
export type UpdateBucketListItemInput = z.input<typeof updateBucketListItemSchema>;
