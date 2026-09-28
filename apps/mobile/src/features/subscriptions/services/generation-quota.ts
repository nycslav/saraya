import { ApiGenerationQuotaGateway } from '../gateways/api-generation-quota.gateway';
import type { GenerationQuotaGateway } from '../gateways/generation-quota.gateway';
import { LocalGenerationQuotaGateway } from './local-generation-quota';

export const generationQuotaGateway: GenerationQuotaGateway = process.env.EXPO_PUBLIC_DATA_MODE === 'api'
  ? new ApiGenerationQuotaGateway()
  : new LocalGenerationQuotaGateway();
