import { useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';

import { notificationGateway } from '@/features/notifications/gateway';
import { addNotificationResponseListener, addPushTokenListener, configureForegroundNotificationBehavior, getInitialNotificationData } from './expo-notifications';
import { routeForNotificationData } from './routing';

export function NotificationObserver() {
  const router = useRouter();
  useEffect(() => {
    configureForegroundNotificationBehavior();
    let active = true;
    const navigate = (data: unknown) => {
      const route = routeForNotificationData(data);
      if (active && route) router.push(route as Href);
    };
    void getInitialNotificationData().then(navigate).catch(() => undefined);
    const responseSubscription = addNotificationResponseListener(navigate);
    const tokenSubscription = addPushTokenListener((pushToken) => void notificationGateway.registerCurrentToken(pushToken).catch(() => undefined));
    return () => { active = false; responseSubscription.remove(); tokenSubscription.remove(); };
  }, [router]);
  return null;
}
