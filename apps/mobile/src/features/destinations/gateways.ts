import type {
  DestinationConditions,
  DestinationSafetySubscription,
} from '@saraya/contracts';
import { createAuthenticatedApiClient } from '@/features/auth/authenticated-api';

export interface DestinationConditionsGateway {
  getConditions(destinationId: string): Promise<DestinationConditions>;
  getSafetySubscription(destinationId: string): Promise<DestinationSafetySubscription>;
  subscribeToSafetyAlerts(destinationId: string): Promise<DestinationSafetySubscription>;
  unsubscribeFromSafetyAlerts(destinationId: string): Promise<void>;
}

function client() {
  return createAuthenticatedApiClient();
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
