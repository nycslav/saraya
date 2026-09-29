import { z } from 'zod';

export const safetyAlertTypeSchema = z.enum([
  'weather',
  'travel_advisory',
  'cancellation',
  'health_advisory',
  'local_disruption',
]);

export const safetySeveritySchema = z.enum(['green', 'yellow', 'red']);

export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const geoJsonPositionSchema = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
]);

export const affectedAreaSchema = z.object({
  type: z.literal('MultiPolygon'),
  coordinates: z.array(z.array(z.array(geoJsonPositionSchema).min(4)).min(1)).min(1),
});

export const safetySourceSchema = z.object({
  provider: z.string().trim().min(1),
  name: z.string().trim().min(1),
  url: z.string().url().optional(),
  isDemo: z.boolean(),
});

export const safetyAlertSchema = z.object({
  id: z.string().trim().min(1),
  alertType: safetyAlertTypeSchema,
  severity: safetySeveritySchema,
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  details: z.string().trim().min(1),
  advice: z.array(z.string().trim().min(1)).min(1),
  alternatives: z.array(z.string().trim().min(1)),
  affectedRegions: z.array(z.string().trim().min(1)).min(1),
  affectedAreaDescription: z.string().trim().min(1),
  affectedArea: affectedAreaSchema.optional(),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }).nullable(),
  source: safetySourceSchema,
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

const optionalQueryText = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().min(1).optional(),
);

const optionalQueryCoordinate = (minimum: number, maximum: number) =>
  z.preprocess(
    (value) => (value === undefined || value === '' ? undefined : value),
    z.coerce.number().min(minimum).max(maximum).optional(),
  );

const locationQueryFields = {
  latitude: optionalQueryCoordinate(-90, 90),
  longitude: optionalQueryCoordinate(-180, 180),
  region: optionalQueryText,
  destinationId: optionalQueryText,
};

function hasExactlyOneLocationContext(value: {
  latitude?: number;
  longitude?: number;
  region?: string;
  destinationId?: string;
}) {
  const hasLatitude = value.latitude !== undefined;
  const hasLongitude = value.longitude !== undefined;
  if (hasLatitude !== hasLongitude) return false;
  const contexts = Number(hasLatitude && hasLongitude) + Number(Boolean(value.region)) + Number(Boolean(value.destinationId));
  return contexts === 1;
}

export const safetyAlertQuerySchema = z
  .object({
    ...locationQueryFields,
    severity: safetySeveritySchema.optional(),
    alertType: safetyAlertTypeSchema.optional(),
  })
  .strict()
  .refine(hasExactlyOneLocationContext, {
    message: 'Provide exactly one location context: latitude with longitude, region, or destinationId.',
  });

export const weatherQuerySchema = z
  .object(locationQueryFields)
  .strict()
  .refine(hasExactlyOneLocationContext, {
    message: 'Provide exactly one location context: latitude with longitude, region, or destinationId.',
  });

export const resolvedLocationSchema = z.object({
  kind: z.enum(['coordinates', 'region', 'destination']),
  label: z.string().trim().min(1),
  region: z.string().trim().min(1),
  destinationId: z.string().trim().min(1).optional(),
  coordinates: coordinatesSchema.optional(),
});

export const safetyAlertListResponseSchema = z.object({
  location: resolvedLocationSchema,
  alerts: z.array(safetyAlertSchema),
});

export const weatherResponseSchema = z.object({
  location: resolvedLocationSchema,
  condition: z.string().trim().min(1).nullable(),
  temperatureCelsius: z.number().min(-100).max(100).nullable(),
  relativeHumidityPercent: z.number().min(0).max(100).nullable(),
  apparentTemperatureCelsius: z.number().min(-100).max(100).nullable(),
  precipitationProbability: z.number().min(0).max(100).nullable(),
  precipitationMillimeters: z.number().min(0).nullable(),
  rainfallMillimeters: z.number().min(0).nullable(),
  windSpeedKilometersPerHour: z.number().min(0).nullable(),
  windDirectionDegrees: z.number().min(0).max(360).nullable(),
  warningState: z.enum(['no-warning', 'advisory', 'unavailable']),
  summary: z.string().trim().min(1),
  observedAt: z.string().datetime({ offset: true }).nullable(),
  fetchedAt: z.string().datetime({ offset: true }).nullable(),
  providerStatus: z.enum(['fresh', 'stale', 'unavailable']),
  source: safetySourceSchema,
});

export type SafetyAlertType = z.infer<typeof safetyAlertTypeSchema>;
export type SafetySeverity = z.infer<typeof safetySeveritySchema>;
export type Coordinates = z.infer<typeof coordinatesSchema>;
export type AffectedArea = z.infer<typeof affectedAreaSchema>;
export type SafetySource = z.infer<typeof safetySourceSchema>;
export type SafetyAlert = z.infer<typeof safetyAlertSchema>;
export type SafetyAlertQuery = z.infer<typeof safetyAlertQuerySchema>;
export type WeatherQuery = z.infer<typeof weatherQuerySchema>;
export type ResolvedLocation = z.infer<typeof resolvedLocationSchema>;
export type SafetyAlertListResponse = z.infer<typeof safetyAlertListResponseSchema>;
export type WeatherResponse = z.infer<typeof weatherResponseSchema>;
