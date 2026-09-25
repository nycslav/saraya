import { routeForNotificationData } from '../routing';

describe('notification deep-link validation', () => {
  it('maps safety and festival payloads to known routes', () => {
    expect(routeForNotificationData({ type: 'safety_alert', alertId: 'alert 1' })).toBe('/alerts/alert%201');
    expect(routeForNotificationData({ type: 'festival_reminder', festivalId: 'sinulog' })).toBe('/festivals/sinulog');
  });

  it('rejects malformed, unknown, missing-ID, and arbitrary URL payloads', () => {
    expect(routeForNotificationData({ type: 'safety_alert' })).toBeNull();
    expect(routeForNotificationData({ type: 'unknown', targetId: 'x' })).toBeNull();
    expect(routeForNotificationData({ type: 'festival_reminder', festivalId: 'x', url: 'https://evil.test' })).toBeNull();
    expect(routeForNotificationData(null)).toBeNull();
  });
});
