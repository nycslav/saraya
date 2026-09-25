import {
  devicePlatformSchema,
  deviceTokenRegistrationSchema,
  notificationPreferencesSchema,
  pushNotificationDataSchema,
  updateNotificationPreferencesSchema,
} from '@saraya/contracts';

describe('notification contracts', () => {
  it('accepts supported device registrations and rejects invalid tokens/platforms', () => {
    expect(deviceTokenRegistrationSchema.parse({ pushToken: 'ExpoPushToken[abc_123]', platform: 'android' })).toBeDefined();
    expect(() => deviceTokenRegistrationSchema.parse({ pushToken: 'not-a-token', platform: 'android' })).toThrow();
    expect(() => devicePlatformSchema.parse('web')).toThrow();
  });

  it('validates complete and partial preferences', () => {
    expect(notificationPreferencesSchema.parse({ safetyAlertsEnabled: true, festivalRemindersEnabled: false })).toBeDefined();
    expect(updateNotificationPreferencesSchema.parse({ safetyAlertsEnabled: true })).toEqual({ safetyAlertsEnabled: true });
    expect(() => updateNotificationPreferencesSchema.parse({})).toThrow();
    expect(() => updateNotificationPreferencesSchema.parse({ marketingEnabled: true })).toThrow();
  });

  it('accepts only closed safety and festival payloads', () => {
    expect(pushNotificationDataSchema.parse({ type: 'safety_alert', alertId: 'alert-1', severity: 'red' })).toBeDefined();
    expect(pushNotificationDataSchema.parse({ type: 'festival_reminder', festivalId: 'sinulog' })).toBeDefined();
    expect(() => pushNotificationDataSchema.parse({ type: 'safety_alert' })).toThrow();
    expect(() => pushNotificationDataSchema.parse({ type: 'marketing', targetId: 'x' })).toThrow();
    expect(() => pushNotificationDataSchema.parse({ type: 'safety_alert', alertId: 'x', url: 'https://evil.test' })).toThrow();
  });
});
