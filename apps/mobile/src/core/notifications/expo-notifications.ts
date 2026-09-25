import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export class PushNotificationsUnavailableError extends Error {
  constructor(message: string) { super(message); this.name = 'PushNotificationsUnavailableError'; }
}

export function configureForegroundNotificationBehavior() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

export async function requestNotificationPermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

export async function getExpoPushToken() {
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof projectId !== 'string' || !projectId.trim()) throw new PushNotificationsUnavailableError('The EAS project ID is not configured.');
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', { name: 'Saraya notifications', importance: Notifications.AndroidImportance.HIGH });
  }
  try { return (await Notifications.getExpoPushTokenAsync({ projectId })).data; }
  catch { throw new PushNotificationsUnavailableError('Saraya could not obtain a push token. Try again later.'); }
}

export function addNotificationResponseListener(listener: (data: unknown) => void) {
  return Notifications.addNotificationResponseReceivedListener((response) => listener(response.notification.request.content.data));
}
export function addNotificationReceivedListener(listener: (data: unknown) => void) {
  return Notifications.addNotificationReceivedListener((notification) => listener(notification.request.content.data));
}
export function addPushTokenListener(listener: (token: string) => void) {
  // Expo reports a changed native APNs/FCM token here. Re-resolve the Expo token
  // before registering it because the backend sends through Expo Push Service.
  return Notifications.addPushTokenListener(() => {
    void getExpoPushToken().then(listener).catch(() => undefined);
  });
}
export async function getInitialNotificationData() {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (response) await Notifications.clearLastNotificationResponseAsync();
  return response?.notification.request.content.data;
}
