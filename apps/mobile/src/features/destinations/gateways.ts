import type {
  DestinationConditions,
  DestinationSafetySubscription,
} from '@saraya/contracts';
import { createApiClient } from '@saraya/api-client';

import { getApiBaseUrl } from '@/core/config';
import { sessionStore } from '@/features/auth/sessionStore';

export interface DestinationConditionsGateway {
  getConditions(destinationId: string): Promise<DestinationConditions>;
  getSafetySubscription(destinationId: string): Promise<DestinationSafetySubscription>;
  subscribeToSafetyAlerts(destinationId: string): Promise<DestinationSafetySubscription>;
  unsubscribeFromSafetyAlerts(destinationId: string): Promise<void>;
}

function client() {
  return createApiClient(
    getApiBaseUrl(),
    async () => (await sessionStore.read())?.accessToken ?? null,
  );
}

export class ApiDestinationConditionsGateway implements DestinationConditionsGateway {
  getConditions(destinationId: string) {
    return client().destinations.getConditions(destinationId);
  }

  getSafetySubscription(destinationId: string) {
    return client().destinations.getSafetySubscription(destinationId);
  }

  subscribeToSafetyAlerts(destinationId: string) {
    return client().destinations.subscribeToSafetyAlerts(destinationId);
  }

  unsubscribeFromSafetyAlerts(destinationId: string) {
    return client().destinations.unsubscribeFromSafetyAlerts(destinationId);
  }
}

export const destinationConditionsGateway: DestinationConditionsGateway =
  new ApiDestinationConditionsGateway();
