import { createApiClient } from '@saraya/api-client';
import type { GenerationConsumption, PremiumAccess } from '@saraya/contracts';

import { getApiBaseUrl } from '@/core/config';
import { sessionStore } from '@/features/auth/sessionStore';

import type { GenerationQuotaGateway } from './generation-quota.gateway';

function client() {
  return createApiClient(
    getApiBaseUrl(),
    async () => (await sessionStore.read())?.accessToken ?? null,
  );
}

export class ApiGenerationQuotaGateway implements GenerationQuotaGateway {
  async getQuota(_access: PremiumAccess) {
    return (await client().subscriptions.synchronize()).quota;
  }

  async refreshAfterServerGeneration() {
    return (await client().subscriptions.getState()).quota;
  }

  async consumeAfterSuccess(_access: PremiumAccess): Promise<GenerationConsumption> {
    throw new Error('The API consumes generation quota atomically with itinerary generation.');
  }

  async creditTopUp(_access: PremiumAccess, _transactionId: string) {
    const before = await client().subscriptions.getState();
    const after = await client().subscriptions.synchronize();
    return {
      credited: after.quota.topUpRemaining > before.quota.topUpRemaining,
      quota: after.quota,
    };
  }
}
