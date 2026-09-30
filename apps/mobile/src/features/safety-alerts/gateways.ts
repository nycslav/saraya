import type {
  SafetyAlert,
  SafetyAlertListResponse,
  SafetyAlertQuery,
  WeatherQuery,
  WeatherResponse,
  SafetyAlertSubscription,
  SafetyAlertSubscriptionInput,
} from '@saraya/contracts';
import { createApiClient } from '@saraya/api-client';

import { getApiBaseUrl } from '@/core/config';
import { sessionStore } from '@/features/auth/sessionStore';

import { findDemoAlert, getDemoWeather, listDemoAlerts } from './data/demoSafety';

export interface SafetyAlertGateway {
  list(query: SafetyAlertQuery): Promise<SafetyAlertListResponse>;
  getById(id: string): Promise<SafetyAlert | null>;
  getWeather(query: WeatherQuery): Promise<WeatherResponse>;
}

export class ApiSafetyAlertGateway implements SafetyAlertGateway {
  private get client() {
    return createApiClient(getApiBaseUrl());
  }

  list(query: SafetyAlertQuery) {
    return this.client.safety.list(query);
  }

  async getById(id: string) {
    try {
      return await this.client.safety.getById(id);
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) return null;
      throw error;
    }
  }

  getWeather(query: WeatherQuery) {
    return this.client.safety.getWeather(query);
  }
}

export class FixtureSafetyAlertGateway implements SafetyAlertGateway {
  constructor(private readonly shouldFail = false) {}

  async list(query: SafetyAlertQuery) {
    if (this.shouldFail) throw new Error('Safety demo unavailable.');
    return listDemoAlerts(query);
  }

  async getById(id: string) {
    if (this.shouldFail) throw new Error('Safety demo unavailable.');
    return findDemoAlert(id);
  }

  async getWeather(query: WeatherQuery) {
    if (this.shouldFail) throw new Error('Weather demo unavailable.');
    return getDemoWeather(query);
  }
}

export const safetyAlertGateway: SafetyAlertGateway =
  process.env.EXPO_PUBLIC_DATA_MODE === 'api'
    ? new ApiSafetyAlertGateway()
    : new FixtureSafetyAlertGateway();

export interface SafetySubscriptionGateway {
  get(input: SafetyAlertSubscriptionInput): Promise<SafetyAlertSubscription>;
  subscribe(input: SafetyAlertSubscriptionInput): Promise<SafetyAlertSubscription>;
  unsubscribe(input: SafetyAlertSubscriptionInput): Promise<void>;
}

export class ApiSafetySubscriptionGateway implements SafetySubscriptionGateway {
  private get client() {
    return createApiClient(getApiBaseUrl(), async () => (await sessionStore.read())?.accessToken ?? null);
  }
  get(input: SafetyAlertSubscriptionInput) { return this.client.safety.getSubscription(input); }
  subscribe(input: SafetyAlertSubscriptionInput) { return this.client.safety.subscribe(input); }
  unsubscribe(input: SafetyAlertSubscriptionInput) { return this.client.safety.unsubscribe(input); }
}

export const safetySubscriptionGateway: SafetySubscriptionGateway = new ApiSafetySubscriptionGateway();
