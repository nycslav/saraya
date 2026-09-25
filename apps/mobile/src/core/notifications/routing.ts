import { pushNotificationDataSchema } from '@saraya/contracts';

export function routeForNotificationData(rawData: unknown) {
  const result = pushNotificationDataSchema.safeParse(rawData);
  if (!result.success) return null;
  return result.data.type === 'safety_alert'
    ? `/alerts/${encodeURIComponent(result.data.alertId)}` as const
    : `/festivals/${encodeURIComponent(result.data.festivalId)}` as const;
}
