import type { DeliveryResult, NotificationMessage, NotificationProvider } from './notification.provider';

const endpoint = 'https://exp.host/--/api/v2/push/send';
const batchSize = 100;

type ExpoTicket = {
  status?: string;
  id?: string;
  message?: string;
  details?: { error?: string };
};

export class ExpoPushNotificationProvider implements NotificationProvider {
  constructor(
    private readonly transport: typeof fetch = fetch,
    private readonly timeoutMs = 10_000,
  ) {}

  async send(messages: NotificationMessage[]): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];
    for (let index = 0; index < messages.length; index += batchSize) {
      const batch = messages.slice(index, index + batchSize);
      results.push(...await this.sendBatch(batch));
    }
    return results;
  }

  private async sendBatch(messages: NotificationMessage[]): Promise<DeliveryResult[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.transport(endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(messages.map((message) => ({
          ...message,
          sound: 'default',
          priority: message.data.type === 'safety_alert' ? 'high' : 'default',
        }))),
        signal: controller.signal,
      });
      if (!response.ok) return messages.map((message) => failed(message, `HTTP_${response.status}`, 'Expo Push Service rejected the request.'));
      const payload = await response.json() as { data?: ExpoTicket[] };
      return messages.map((message, index) => normalizeTicket(message, payload.data?.[index]));
    } catch (error) {
      const reason = error instanceof Error && error.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR';
      return messages.map((message) => failed(message, reason, 'Expo Push Service is unavailable.'));
    } finally {
      clearTimeout(timeout);
    }
  }
}

function normalizeTicket(message: NotificationMessage, ticket?: ExpoTicket): DeliveryResult {
  if (ticket?.status === 'ok') {
    return { pushToken: message.to, status: 'accepted', ticketId: ticket.id, shouldDeactivateToken: false };
  }
  const code = ticket?.details?.error ?? 'PROVIDER_ERROR';
  return failed(message, code, ticket?.message ?? 'Expo did not accept the notification.');
}

function failed(message: NotificationMessage, code: string, errorMessage: string): DeliveryResult {
  return {
    pushToken: message.to,
    status: 'failed',
    errorCode: code,
    errorMessage,
    shouldDeactivateToken: code === 'DeviceNotRegistered',
  };
}
