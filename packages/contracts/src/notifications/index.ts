import { z } from 'zod';

export const notificationCategorySchema = z.enum(['safety_alert', 'festival_reminder']);
export const devicePlatformSchema = z.enum(['android', 'ios']);

export const expoPushTokenSchema = z.string().trim().regex(
  /^(?:ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/,
  'Enter a valid Expo push token.',
);

export const deviceTokenRegistrationSchema = z.object({
  pushToken: expoPushTokenSchema,
  platform: devicePlatformSchema,
}).strict();

export const deviceTokenRemovalSchema = z.object({
  pushToken: expoPushTokenSchema,
}).strict();

export const notificationPreferencesSchema = z.object({
  safetyAlertsEnabled: z.boolean(),
  festivalRemindersEnabled: z.boolean(),
}).strict();

export const updateNotificationPreferencesSchema = notificationPreferencesSchema.partial().strict()
  .refine((value) => Object.keys(value).length > 0, 'Update at least one preference.');

export const safetyNotificationDataSchema = z.object({
  type: z.literal('safety_alert'),
  alertId: z.string().trim().min(1).max(200),
  severity: z.enum(['green', 'yellow', 'red']).optional(),
}).strict();

export const festivalNotificationDataSchema = z.object({
  type: z.literal('festival_reminder'),
  festivalId: z.string().trim().min(1).max(200),
}).strict();

export const pushNotificationDataSchema = z.discriminatedUnion('type', [
  safetyNotificationDataSchema,
  festivalNotificationDataSchema,
]);

export const deviceTokenRegistrationResponseSchema = z.object({ registered: z.literal(true) });

export type NotificationCategory = z.infer<typeof notificationCategorySchema>;
export type DevicePlatform = z.infer<typeof devicePlatformSchema>;
export type DeviceTokenRegistration = z.infer<typeof deviceTokenRegistrationSchema>;
export type DeviceTokenRemoval = z.infer<typeof deviceTokenRemovalSchema>;
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;
export type UpdateNotificationPreferences = z.infer<typeof updateNotificationPreferencesSchema>;
export type PushNotificationData = z.infer<typeof pushNotificationDataSchema>;
