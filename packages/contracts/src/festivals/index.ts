import { z } from 'zod';

import { islandGroupSchema } from '../destinations';

export const directWebUrlSchema = z
  .url()
  .refine((value) => /^https?:\/\//i.test(value), 'Source URL must use HTTP or HTTPS.')
  .refine(
    (value) => !/^https?:\/\/(?:www\.)?(?:google\.[^/]+|bing\.com)(?:\/|$)/i.test(value),
    'Store the direct source URL, not a search-engine URL.',
  );

export const festivalCategorySchema = z.enum(['Arts', 'Cultural', 'Harvest', 'Religious']);
export const festivalScheduleStatusSchema = z.enum([
  'recurring',
  'confirmed',
  'estimated',
  'cancelled',
  'unknown',
]);
export const festivalSourceTypeSchema = z.enum([
  'tpb',
  'dot',
  'ncca',
  'lgu',
  'official-organizer',
  'official-government',
  'regional-tourism',
  'secondary',
  'nhcp',
  'official-cultural-institution',
  'academic',
]);
export const festivalSourcePurposeSchema = z.enum([
  'general',
  'cultural',
  'schedule',
  'announcement',
  'travel',
]);

export const provenanceSourceCoreSchema = z.object({
  id: z.string().min(1),
  publisher: z.string().min(1),
  title: z.string().min(1),
  url: directWebUrlSchema,
  sourceType: festivalSourceTypeSchema,
  accessedAt: z.iso.date(),
});

export const festivalSourceSchema = provenanceSourceCoreSchema.extend({
  purpose: festivalSourcePurposeSchema,
});

export const culturalGuideCategorySchema = z.enum([
  'history',
  'customs',
  'payment',
  'pasalubong',
  'dining',
  'photography-social',
]);

export const culturalGuideVerificationStatusSchema = z.enum([
  'verified',
  'partially-verified',
  'general-guidance',
  'insufficient-evidence',
]);

export const culturalGuideSourceSchema = provenanceSourceCoreSchema.extend({
  supports: z.array(culturalGuideCategorySchema).min(1),
});

export const culturalGuideSectionSchema = z.object({
  text: z.string().trim().min(1),
  verificationStatus: culturalGuideVerificationStatusSchema,
  sourceIds: z.array(z.string().min(1)),
});

export const festivalCulturalGuideSchema = z
  .object({
    festivalId: z.string().min(1),
    lastReviewedAt: z.iso.date(),
    categories: z.object({
      history: culturalGuideSectionSchema,
      customs: culturalGuideSectionSchema,
      payment: culturalGuideSectionSchema,
      pasalubong: culturalGuideSectionSchema,
      dining: culturalGuideSectionSchema,
      'photography-social': culturalGuideSectionSchema,
    }),
    sources: z.array(culturalGuideSourceSchema),
  })
  .superRefine((guide, context) => {
    const sourceIds = guide.sources.map((source) => source.id);
    if (new Set(sourceIds).size !== sourceIds.length) {
      context.addIssue({ code: 'custom', message: 'Cultural source IDs must be unique.' });
    }

    for (const [category, section] of Object.entries(guide.categories)) {
      const requiresEvidence =
        section.verificationStatus === 'verified' ||
        section.verificationStatus === 'partially-verified';
      if (requiresEvidence && section.sourceIds.length === 0) {
        context.addIssue({
          code: 'custom',
          message: `${section.verificationStatus} cultural content requires a source.`,
          path: ['categories', category, 'sourceIds'],
        });
      }

      if (
        (section.verificationStatus === 'general-guidance' ||
          section.verificationStatus === 'insufficient-evidence') &&
        section.sourceIds.length > 0
      ) {
        context.addIssue({
          code: 'custom',
          message: `${section.verificationStatus} content must not imply external verification.`,
          path: ['categories', category, 'sourceIds'],
        });
      }

      for (const sourceId of section.sourceIds) {
        const source = guide.sources.find((candidate) => candidate.id === sourceId);
        if (!source) {
          context.addIssue({
            code: 'custom',
            message: `Cultural section references unknown source ID: ${sourceId}.`,
            path: ['categories', category, 'sourceIds'],
          });
        } else if (!source.supports.includes(category as CulturalGuideCategory)) {
          context.addIssue({
            code: 'custom',
            message: `Source ${sourceId} does not support ${category}.`,
            path: ['categories', category, 'sourceIds'],
          });
        }
      }
    }
  });

export const festivalScheduleItemSchema = z.object({
  time: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
});

export const festivalOccurrenceEventSchema = z.object({
  date: z.iso.date(),
  time: z.string().min(1).optional(),
  title: z.string().min(1),
  description: z.string().min(1),
});

export const festivalOccurrenceSchema = z
  .object({
    scheduleYear: z.number().int().min(2000).max(2200).optional(),
    scheduleStatus: festivalScheduleStatusSchema,
    confirmedStartDate: z.iso.date().optional(),
    confirmedEndDate: z.iso.date().optional(),
    estimatedDateDescription: z.string().min(1).optional(),
    verificationNote: z.string().min(1),
    lastVerifiedAt: z.iso.datetime({ offset: true }),
    sourceIds: z.array(z.string().min(1)).min(1),
    events: z.array(festivalOccurrenceEventSchema).default([]),
  })
  .superRefine((occurrence, context) => {
    const hasConfirmedDates = Boolean(occurrence.confirmedStartDate || occurrence.confirmedEndDate);

    if (occurrence.scheduleStatus === 'confirmed') {
      if (
        !occurrence.scheduleYear ||
        !occurrence.confirmedStartDate ||
        !occurrence.confirmedEndDate
      ) {
        context.addIssue({
          code: 'custom',
          message: 'A confirmed occurrence requires a year and confirmed start and end dates.',
        });
      } else if (occurrence.confirmedEndDate < occurrence.confirmedStartDate) {
        context.addIssue({
          code: 'custom',
          message: 'The confirmed end date cannot precede the confirmed start date.',
        });
      }
    } else if (hasConfirmedDates) {
      context.addIssue({
        code: 'custom',
        message: 'Only confirmed occurrences may contain confirmed dates.',
      });
    }

    if (occurrence.scheduleStatus === 'estimated' && !occurrence.estimatedDateDescription) {
      context.addIssue({
        code: 'custom',
        message: 'An estimated occurrence requires an estimated date description.',
      });
    }

    if (occurrence.scheduleStatus === 'cancelled' && !occurrence.scheduleYear) {
      context.addIssue({
        code: 'custom',
        message: 'A cancelled occurrence requires the affected year.',
      });
    }
  });

export const sarayaFestivalEditorialSchema = z.object({
  attribution: z.literal('Saraya-curated'),
  lastReviewedAt: z.iso.date(),
  travelAdvice: z.array(z.string().min(1)).min(1),
  survivalGuide: z.array(z.string().min(1)).min(1),
  accommodationWarning: z.string().min(1),
  diningWarning: z.string().min(1),
});

export const festivalSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  city: z.string().min(1),
  province: z.string().min(1),
  region: z.string().min(1),
  islandGroup: islandGroupSchema,
  typicalMonth: z.number().int().min(1).max(12),
  recurrenceDescription: z.string().min(1),
  occurrence: festivalOccurrenceSchema,
  category: festivalCategorySchema,
  summary: z.string().min(1),
  heroTone: z.enum(['sky', 'sunset', 'forest', 'lagoon', 'violet', 'gold']),
  tags: z.array(z.string().min(1)).min(1),
});

export const festivalDetailSchema = festivalSummarySchema
  .extend({
    history: z.string().min(1),
    culturalSignificance: z.string().min(1),
    signatureEvents: z.array(z.string().min(1)).min(1),
    typicalSchedule: z.array(festivalScheduleItemSchema).min(1),
    sources: z.array(festivalSourceSchema).min(1),
    sarayaEditorial: sarayaFestivalEditorialSchema,
  })
  .superRefine((festival, context) => {
    const sourceIds = festival.sources.map((source) => source.id);
    if (new Set(sourceIds).size !== sourceIds.length) {
      context.addIssue({ code: 'custom', message: 'Festival source IDs must be unique.' });
    }

    for (const sourceId of festival.occurrence.sourceIds) {
      if (!sourceIds.includes(sourceId)) {
        context.addIssue({
          code: 'custom',
          message: `Occurrence references unknown source ID: ${sourceId}.`,
          path: ['occurrence', 'sourceIds'],
        });
      }
    }

    if (festival.occurrence.scheduleStatus === 'confirmed') {
      const qualifyingTypes = new Set([
        'lgu',
        'official-organizer',
        'official-government',
        'regional-tourism',
      ]);
      const hasOfficialScheduleSource = festival.sources.some(
        (source) =>
          festival.occurrence.sourceIds.includes(source.id) &&
          qualifyingTypes.has(source.sourceType) &&
          (source.purpose === 'schedule' || source.purpose === 'announcement'),
      );
      if (!hasOfficialScheduleSource) {
        context.addIssue({
          code: 'custom',
          message: 'A confirmed occurrence requires an official schedule or announcement source.',
          path: ['occurrence'],
        });
      }
    }
  });

export const festivalDetailWithCultureSchema = festivalDetailSchema.safeExtend({
  culturalGuide: festivalCulturalGuideSchema,
});

export const festivalQuerySchema = z.object({
  search: z.string().trim().optional(),
  region: z.string().trim().min(1).optional(),
  month: z.number().int().min(1).max(12).optional(),
});

export type FestivalCategory = z.infer<typeof festivalCategorySchema>;
export type FestivalScheduleStatus = z.infer<typeof festivalScheduleStatusSchema>;
export type FestivalSourceType = z.infer<typeof festivalSourceTypeSchema>;
export type FestivalSourcePurpose = z.infer<typeof festivalSourcePurposeSchema>;
export type CulturalGuideCategory = z.infer<typeof culturalGuideCategorySchema>;
export type CulturalGuideVerificationStatus = z.infer<typeof culturalGuideVerificationStatusSchema>;
export type CulturalGuideSource = z.infer<typeof culturalGuideSourceSchema>;
export type CulturalGuideSection = z.infer<typeof culturalGuideSectionSchema>;
export type FestivalCulturalGuide = z.infer<typeof festivalCulturalGuideSchema>;
export type FestivalSource = z.infer<typeof festivalSourceSchema>;
export type FestivalScheduleItem = z.infer<typeof festivalScheduleItemSchema>;
export type FestivalOccurrenceEvent = z.infer<typeof festivalOccurrenceEventSchema>;
export type FestivalOccurrence = z.infer<typeof festivalOccurrenceSchema>;
export type SarayaFestivalEditorial = z.infer<typeof sarayaFestivalEditorialSchema>;
export type FestivalSummary = z.infer<typeof festivalSummarySchema>;
export type FestivalDetail = z.infer<typeof festivalDetailSchema>;
export type FestivalDetailWithCulture = z.infer<typeof festivalDetailWithCultureSchema>;
export type FestivalQuery = z.infer<typeof festivalQuerySchema>;
