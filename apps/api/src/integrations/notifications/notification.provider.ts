import type { PushNotificationData } from '@saraya/contracts';

export type NotificationMessage = {
  to: string;
  title: string;
  body: string;
  data: PushNotificationData;
};

export type DeliveryResult = {
  pushToken: string;
  status: 'accepted' | 'failed';
  ticketId?: string;
  errorCode?: string;
  errorMessage?: string;
  shouldDeactivateToken: boolean;
};

export interface NotificationProvider {
  send(messages: NotificationMessage[]): Promise<DeliveryResult[]>;
}
