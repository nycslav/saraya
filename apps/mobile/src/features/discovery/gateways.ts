import type {
  DestinationDetail,
  DestinationSummary,
  DiscoveryQuery,
} from '@saraya/contracts';
import { createApiClient } from '@saraya/api-client';

import { getApiBaseUrl } from '@/core/config';

export interface DestinationGateway {
  list(query: DiscoveryQuery): Promise<DestinationSummary[]>;
  getById(id: string): Promise<DestinationDetail | null>;
}

export class ApiDestinationGateway implements DestinationGateway {
  private get client() {
    return createApiClient(getApiBaseUrl());
  }

  list(query: DiscoveryQuery) {
    return this.client.destinations.list(query);
  }

  getById(id: string) {
    return this.client.destinations.getById(id);
  }
}

export const destinationGateway: DestinationGateway = new ApiDestinationGateway();
