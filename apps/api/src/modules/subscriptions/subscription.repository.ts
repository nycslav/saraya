import type {
  GenerationConsumption,
  GenerationCreditSource,
  PremiumAccess,
  SubscriptionState,
} from '@saraya/contracts';

import type {
  RevenueCatCustomerSnapshot,
  RevenueCatWebhookEvent,
} from '../../integrations/revenuecat';
import { hasDatabaseConfiguration } from '../../platform/database/pool';
import { PostgresSubscriptionRepository } from './subscription.postgres-repository';

export const FREE_LIFETIME_LIMIT = 3;
export const PREMIUM_MONTHLY_LIMIT = 10;
export const TOP_UP_SIZE = 10;

export type SubscriptionConfiguration = {
  entitlementId: string;
  lifetimeProductId: string;
  topUpProductId: string;
};

export const subscriptionConfiguration: SubscriptionConfiguration = {
  entitlementId: process.env.REVENUECAT_ENTITLEMENT_ID ?? 'saraya_premium',
  lifetimeProductId:
    process.env.REVENUECAT_LIFETIME_PRODUCT_ID ?? 'saraya_premium_lifetime',
  topUpProductId:
    process.env.REVENUECAT_TOP_UP_PRODUCT_ID ?? 'saraya_generations_10',
};

export type WebhookProcessingStatus =
  | 'processed'
  | 'duplicate'
  | 'pending-association'
  | 'ignored';

export type GenerationReservation = {
  id: string;
  userId: string;
  source: GenerationCreditSource;
  access: PremiumAccess;
  periodStart: string | null;
};

export interface SubscriptionRepository {
  associateCustomer(userId: string, customerId: string): Promise<void>;
  synchronizeCustomer(
    userId: string,
    customerId: string,
    snapshot: RevenueCatCustomerSnapshot,
    synchronizedAt: Date,
  ): Promise<void>;
  processWebhook(
    event: RevenueCatWebhookEvent,
    configuration: SubscriptionConfiguration,
  ): Promise<WebhookProcessingStatus>;
  getState(userId: string, now: Date): Promise<SubscriptionState>;
  reserveGeneration(userId: string, reservationId: string, now: Date): Promise<GenerationReservation>;
  consumeReservation(reservationId: string, now: Date): Promise<GenerationConsumption>;
  releaseReservation(reservationId: string, now: Date): Promise<void>;
}

type Entitlement = {
  active: boolean;
  productId: string | null;
  originalTransactionId: string | null;
  expiresAt: Date | null;
  eventAt: Date;
};

type Account = {
  freeUsed: number;
  premiumPeriodStart: string | null;
  premiumUsed: number;
  topUpBalance: number;
};

type StoredEvent = {
  event: RevenueCatWebhookEvent;
  status: 'pending-association' | 'processed' | 'ignored';
};

type StoredReservation = GenerationReservation & {
  status: 'reserved' | 'consumed' | 'released';
};

type TopUpTransaction = {
  userId: string;
  creditsRemaining: number;
  refunded: boolean;
};

export class GenerationQuotaExhaustedError extends Error {
  constructor() {
    super('No itinerary generation credits remain.');
    this.name = 'GenerationQuotaExhaustedError';
  }
}

export class GenerationReservationNotFoundError extends Error {}

export class InMemorySubscriptionRepository implements SubscriptionRepository {
  private readonly customerUsers = new Map<string, string>();
  private readonly entitlements = new Map<string, Entitlement>();
  private readonly accounts = new Map<string, Account>();
  private readonly topUpTransactions = new Map<string, TopUpTransaction>();
  private readonly events = new Map<string, StoredEvent>();
  private readonly reservations = new Map<string, StoredReservation>();
  private queue: Promise<unknown> = Promise.resolve();

  private serialize<T>(operation: () => T | Promise<T>): Promise<T> {
    const next = this.queue.then(operation, operation);
    this.queue = next.then(() => undefined, () => undefined);
    return next;
  }

  associateCustomer(userId: string, customerId: string) {
    return this.serialize(async () => {
      this.customerUsers.set(customerId, userId);
    });
  }

  synchronizeCustomer(
    userId: string,
    customerId: string,
    snapshot: RevenueCatCustomerSnapshot,
    synchronizedAt: Date,
  ) {
    return this.serialize(async () => {
      this.customerUsers.set(customerId, userId);
      this.entitlements.set(userId, {
        active: snapshot.premiumActive,
        productId: snapshot.premiumProductId,
        originalTransactionId: snapshot.premiumOriginalTransactionId,
        expiresAt: snapshot.premiumExpiresAt,
        eventAt: synchronizedAt,
      });
      for (const topUp of snapshot.topUps) {
        this.creditTopUp(userId, topUp.transactionId, TOP_UP_SIZE);
      }
      for (const stored of this.events.values()) {
        if (
          stored.status === 'pending-association' &&
          [stored.event.app_user_id, ...stored.event.aliases, ...stored.event.transferred_to]
            .includes(customerId)
        ) {
          stored.status = 'processed';
        }
      }
    });
  }

  processWebhook(event: RevenueCatWebhookEvent, configuration: SubscriptionConfiguration) {
    return this.serialize(async (): Promise<WebhookProcessingStatus> => {
      if (this.events.has(event.id)) return 'duplicate';
      const userId = this.resolveUser(event);
      if (!userId) {
        this.events.set(event.id, { event, status: 'pending-association' });
        return 'pending-association';
      }
      const status = this.applyEvent(userId, event, configuration);
      this.events.set(event.id, { event, status });
      return status;
    });
  }

  getState(userId: string, now: Date) {
    return this.serialize(async () => this.snapshot(userId, now));
  }

  reserveGeneration(userId: string, reservationId: string, now: Date) {
    return this.serialize(async () => {
      const existing = this.reservations.get(reservationId);
      if (existing) return { ...existing };
      const account = this.account(userId);
      const access = this.access(userId, now);
      const periodStart = access === 'premium' ? currentPeriodStart(now) : null;
      this.resetPremiumPeriod(account, periodStart);
      const includedLimit = access === 'premium' ? PREMIUM_MONTHLY_LIMIT : FREE_LIFETIME_LIMIT;
      const includedUsed = access === 'premium' ? account.premiumUsed : account.freeUsed;
      const includedReserved = [...this.reservations.values()].filter(
        (reservation) =>
          reservation.userId === userId &&
          reservation.status === 'reserved' &&
          reservation.source === 'included' &&
          reservation.access === access &&
          reservation.periodStart === periodStart,
      ).length;
      const topUpReserved = [...this.reservations.values()].filter(
        (reservation) =>
          reservation.userId === userId &&
          reservation.status === 'reserved' &&
          reservation.source === 'top-up',
      ).length;
      let source: GenerationCreditSource;
      if (includedUsed + includedReserved < includedLimit) source = 'included';
      else if (account.topUpBalance - topUpReserved > 0) source = 'top-up';
      else throw new GenerationQuotaExhaustedError();

      const reservation: StoredReservation = {
        id: reservationId,
        userId,
        source,
        access,
        periodStart,
        status: 'reserved',
      };
      this.reservations.set(reservationId, reservation);
      return { id: reservation.id, userId, source, access, periodStart };
    });
  }

  consumeReservation(reservationId: string, now: Date) {
    return this.serialize(async () => {
      const reservation = this.reservations.get(reservationId);
      if (!reservation || reservation.status !== 'reserved') {
        throw new GenerationReservationNotFoundError('Generation reservation is not active.');
      }
      const account = this.account(reservation.userId);
      if (reservation.source === 'top-up') {
        if (account.topUpBalance <= 0) throw new GenerationQuotaExhaustedError();
        account.topUpBalance -= 1;
        const transaction = [...this.topUpTransactions.values()].find(
          (candidate) =>
            candidate.userId === reservation.userId &&
            !candidate.refunded &&
            candidate.creditsRemaining > 0,
        );
        if (transaction) transaction.creditsRemaining -= 1;
      }
      else if (reservation.access === 'premium') {
        if (reservation.periodStart === currentPeriodStart(now)) {
          this.resetPremiumPeriod(account, reservation.periodStart);
          account.premiumUsed += 1;
        }
      } else account.freeUsed += 1;
      reservation.status = 'consumed';
      return {
        source: reservation.source,
        quota: this.snapshot(reservation.userId, now).quota,
      };
    });
  }

  releaseReservation(reservationId: string, _now: Date) {
    return this.serialize(async () => {
      const reservation = this.reservations.get(reservationId);
      if (reservation?.status === 'reserved') reservation.status = 'released';
    });
  }

  private resolveUser(event: RevenueCatWebhookEvent) {
    const customerIds = [
      event.app_user_id,
      ...event.aliases,
      ...event.transferred_to,
      ...event.transferred_from,
    ].filter((value): value is string => Boolean(value));
    return customerIds.map((id) => this.customerUsers.get(id)).find(Boolean);
  }

  private applyEvent(
    userId: string,
    event: RevenueCatWebhookEvent,
    configuration: SubscriptionConfiguration,
  ): 'processed' | 'ignored' {
    if (event.type === 'TEST') return 'ignored';
    if (event.type === 'TRANSFER') {
      return this.applyTransfer(event, configuration) ? 'processed' : 'ignored';
    }
    if (
      event.product_id === configuration.topUpProductId &&
      event.type === 'NON_RENEWING_PURCHASE' &&
      event.transaction_id
    ) {
      this.creditTopUp(userId, event.transaction_id, TOP_UP_SIZE);
      return 'processed';
    }
    if (event.product_id === configuration.topUpProductId && event.type === 'CANCELLATION') {
      const transactionId = event.transaction_id ?? event.original_transaction_id;
      if (!transactionId) return 'ignored';
      this.refundTopUp(userId, transactionId);
      return 'processed';
    }
    const affectsPremium =
      event.product_id === configuration.lifetimeProductId ||
      event.entitlement_ids.includes(configuration.entitlementId);
    if (!affectsPremium) return 'ignored';
    const eventAt = new Date(event.event_timestamp_ms);
    const current = this.entitlements.get(userId);
    if (current && current.eventAt > eventAt) return 'ignored';
    const activationEvents = new Set([
      'INITIAL_PURCHASE',
      'RENEWAL',
      'UNCANCELLATION',
      'NON_RENEWING_PURCHASE',
      'REFUND_REVERSED',
      'SUBSCRIPTION_EXTENDED',
    ]);
    const deactivationEvents = new Set(['CANCELLATION', 'EXPIRATION']);
    if (!activationEvents.has(event.type) && !deactivationEvents.has(event.type)) return 'ignored';
    this.entitlements.set(userId, {
      active: activationEvents.has(event.type),
      productId: event.product_id ?? current?.productId ?? null,
      originalTransactionId:
        event.original_transaction_id ?? current?.originalTransactionId ?? null,
      expiresAt: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
      eventAt,
    });
    return 'processed';
  }

  private applyTransfer(event: RevenueCatWebhookEvent, configuration: SubscriptionConfiguration) {
    const destinationUser = event.transferred_to
      .map((id) => this.customerUsers.get(id))
      .find(Boolean);
    if (!destinationUser) return false;
    const sourceUsers = new Set(
      event.transferred_from.map((id) => this.customerUsers.get(id)).filter(Boolean),
    );
    let transferred: Entitlement | undefined;
    for (const sourceUser of sourceUsers) {
      const entitlement = this.entitlements.get(sourceUser!);
      if (entitlement?.active) transferred = entitlement;
      if (entitlement) this.entitlements.set(sourceUser!, { ...entitlement, active: false });
    }
    if (transferred) {
      this.entitlements.set(destinationUser, {
        ...transferred,
        active: true,
        eventAt: new Date(event.event_timestamp_ms),
      });
    } else {
      this.entitlements.set(destinationUser, {
        active: event.entitlement_ids.includes(configuration.entitlementId),
        productId: event.product_id ?? null,
        originalTransactionId: event.original_transaction_id ?? null,
        expiresAt: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
        eventAt: new Date(event.event_timestamp_ms),
      });
    }
    return true;
  }

  private creditTopUp(userId: string, transactionId: string, credits: number) {
    if (this.topUpTransactions.has(transactionId)) return false;
    this.topUpTransactions.set(transactionId, {
      userId,
      creditsRemaining: credits,
      refunded: false,
    });
    this.account(userId).topUpBalance += credits;
    return true;
  }

  private refundTopUp(userId: string, transactionId: string) {
    const transaction = this.topUpTransactions.get(transactionId);
    if (!transaction) {
      this.topUpTransactions.set(transactionId, {
        userId,
        creditsRemaining: 0,
        refunded: true,
      });
      return 0;
    }
    if (transaction.refunded) return 0;
    const account = this.account(transaction.userId);
    const reversed = Math.min(transaction.creditsRemaining, account.topUpBalance);
    account.topUpBalance = Math.max(0, account.topUpBalance - reversed);
    transaction.creditsRemaining = 0;
    transaction.refunded = true;
    return reversed;
  }

  private account(userId: string) {
    let account = this.accounts.get(userId);
    if (!account) {
      account = { freeUsed: 0, premiumPeriodStart: null, premiumUsed: 0, topUpBalance: 0 };
      this.accounts.set(userId, account);
    }
    return account;
  }

  private access(userId: string, now: Date): PremiumAccess {
    const entitlement = this.entitlements.get(userId);
    return entitlement?.active &&
      (!entitlement.expiresAt || entitlement.expiresAt.getTime() > now.getTime())
      ? 'premium'
      : 'free';
  }

  private resetPremiumPeriod(account: Account, periodStart: string | null) {
    if (periodStart && account.premiumPeriodStart !== periodStart) {
      account.premiumPeriodStart = periodStart;
      account.premiumUsed = 0;
    }
  }

  private snapshot(userId: string, now: Date): SubscriptionState {
    const account = this.account(userId);
    const access = this.access(userId, now);
    const periodStart = access === 'premium' ? currentPeriodStart(now) : null;
    this.resetPremiumPeriod(account, periodStart);
    const limit = access === 'premium' ? PREMIUM_MONTHLY_LIMIT : FREE_LIFETIME_LIMIT;
    const used = access === 'premium' ? account.premiumUsed : account.freeUsed;
    const includedReserved = [...this.reservations.values()].filter(
      (reservation) =>
        reservation.userId === userId &&
        reservation.status === 'reserved' &&
        reservation.source === 'included' &&
        reservation.access === access &&
        reservation.periodStart === periodStart,
    ).length;
    const topUpReserved = [...this.reservations.values()].filter(
      (reservation) =>
        reservation.userId === userId &&
        reservation.status === 'reserved' &&
        reservation.source === 'top-up',
    ).length;
    const includedRemaining = Math.max(0, limit - used - includedReserved);
    const topUpRemaining = Math.max(0, account.topUpBalance - topUpReserved);
    const periodEnd = access === 'premium' ? nextPeriodStart(now) : null;
    return {
      access,
      quota: {
        access,
        includedLimit: limit,
        includedRemaining,
        topUpRemaining,
        canGenerate: includedRemaining + topUpRemaining > 0,
        canRegenerate: access === 'premium' && includedRemaining + topUpRemaining > 0,
        periodStart: periodStart ? `${periodStart}T00:00:00.000Z` : null,
        periodEnd: periodEnd ? `${periodEnd}T00:00:00.000Z` : null,
      },
    };
  }
}

export function currentPeriodStart(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function nextPeriodStart(date: Date) {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return currentPeriodStart(next);
}

export function createSubscriptionRepository(): SubscriptionRepository {
  return process.env.NODE_ENV !== 'test' && hasDatabaseConfiguration()
    ? new PostgresSubscriptionRepository()
    : new InMemorySubscriptionRepository();
}
