import type {
  GenerationConsumption,
  GenerationCreditSource,
  PremiumAccess,
  SubscriptionState,
} from '@saraya/contracts';
import type { PoolClient, QueryResultRow } from 'pg';

import type {
  RevenueCatCustomerSnapshot,
  RevenueCatWebhookEvent,
} from '../../integrations/revenuecat';
import { getPool } from '../../platform/database/pool';
import {
  currentPeriodStart,
  FREE_LIFETIME_LIMIT,
  GenerationQuotaExhaustedError,
  GenerationReservationNotFoundError,
  PREMIUM_MONTHLY_LIMIT,
  TOP_UP_SIZE,
  type GenerationReservation,
  type SubscriptionConfiguration,
  type SubscriptionRepository,
  type WebhookProcessingStatus,
} from './subscription.repository';

interface AccountRow extends QueryResultRow {
  free_used: number;
  premium_period_start: Date | string | null;
  premium_used: number;
  top_up_balance: number;
}

interface EntitlementRow extends QueryResultRow {
  is_active: boolean;
  expires_at: Date | string | null;
  product_id?: string | null;
  original_transaction_id?: string | null;
}

interface ReservationRow extends QueryResultRow {
  id: string;
  user_id: string;
  source: GenerationCreditSource;
  access: PremiumAccess;
  period_start: Date | string | null;
  status: 'reserved' | 'consumed' | 'released';
}

export class PostgresSubscriptionRepository implements SubscriptionRepository {
  async associateCustomer(userId: string, customerId: string) {
    await getPool().query(
      `INSERT INTO revenuecat_customers (revenuecat_customer_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (revenuecat_customer_id) DO UPDATE SET
         user_id = EXCLUDED.user_id, updated_at = now()`,
      [customerId, userId],
    );
  }

  async synchronizeCustomer(
    userId: string,
    customerId: string,
    snapshot: RevenueCatCustomerSnapshot,
    synchronizedAt: Date,
  ) {
    await this.transaction(async (client) => {
      await client.query(
        `INSERT INTO revenuecat_customers (revenuecat_customer_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (revenuecat_customer_id) DO UPDATE SET
           user_id = EXCLUDED.user_id, updated_at = now()`,
        [customerId, userId],
      );
      await client.query(
        `INSERT INTO subscription_entitlements (
           user_id, entitlement_id, is_active, product_id, original_transaction_id,
           expires_at, last_event_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id, entitlement_id) DO UPDATE SET
           is_active = EXCLUDED.is_active,
           product_id = EXCLUDED.product_id,
           original_transaction_id = EXCLUDED.original_transaction_id,
           expires_at = EXCLUDED.expires_at,
           last_event_at = EXCLUDED.last_event_at,
           updated_at = now()`,
        [
          userId,
          process.env.REVENUECAT_ENTITLEMENT_ID ?? 'saraya_premium',
          snapshot.premiumActive,
          snapshot.premiumProductId,
          snapshot.premiumOriginalTransactionId,
          snapshot.premiumExpiresAt,
          synchronizedAt,
        ],
      );
      for (const topUp of snapshot.topUps) {
        await this.creditTopUp(
          client,
          userId,
          topUp.transactionId,
          topUp.productId,
          null,
          topUp.purchasedAt,
        );
      }
      await client.query(
        `UPDATE revenuecat_webhook_events
         SET status = 'processed', user_id = $1, processed_at = now()
         WHERE status = 'pending_association'
           AND (app_user_id = $2 OR $2 = ANY(aliases) OR $2 = ANY(transferred_to))`,
        [userId, customerId],
      );
    });
  }

  async processWebhook(
    event: RevenueCatWebhookEvent,
    configuration: SubscriptionConfiguration,
  ): Promise<WebhookProcessingStatus> {
    return this.transaction(async (client) => {
      const inserted = await client.query(
        `INSERT INTO revenuecat_webhook_events (
           event_id, event_type, app_user_id, aliases, transferred_from, transferred_to,
           product_id, entitlement_ids, transaction_id, original_transaction_id,
           environment, event_at, expiration_at, status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending_association')
         ON CONFLICT (event_id) DO NOTHING
         RETURNING event_id`,
        [
          event.id,
          event.type,
          event.app_user_id ?? null,
          event.aliases,
          event.transferred_from,
          event.transferred_to,
          event.product_id ?? null,
          event.entitlement_ids,
          event.transaction_id ?? null,
          event.original_transaction_id ?? null,
          event.environment ?? null,
          new Date(event.event_timestamp_ms),
          event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
        ],
      );
      if (inserted.rowCount === 0) return 'duplicate';

      const customerIds = unique([
        event.app_user_id,
        ...event.aliases,
        ...event.transferred_to,
        ...event.transferred_from,
      ]);
      const users = await this.findAssociatedUsers(client, customerIds);
      const userId = users.get(event.app_user_id ?? '') ?? [...users.values()][0];
      if (!userId) return 'pending-association';

      let status: 'processed' | 'ignored' = 'ignored';
      if (event.type === 'TRANSFER') {
        status = await this.applyTransfer(client, event, users, configuration);
      } else if (
        event.type === 'NON_RENEWING_PURCHASE' &&
        event.product_id === configuration.topUpProductId &&
        event.transaction_id
      ) {
        await this.creditTopUp(
          client,
          userId,
          event.transaction_id,
          event.product_id,
          event.id,
          event.purchased_at_ms ? new Date(event.purchased_at_ms) : null,
        );
        status = 'processed';
      } else if (
        event.product_id === configuration.lifetimeProductId ||
        event.entitlement_ids.includes(configuration.entitlementId)
      ) {
        status = await this.applyEntitlement(client, userId, event, configuration);
      }

      await client.query(
        `UPDATE revenuecat_webhook_events
         SET status = $2, user_id = $3, processed_at = now()
         WHERE event_id = $1`,
        [event.id, status, userId],
      );
      return status;
    });
  }

  async getState(userId: string, now: Date): Promise<SubscriptionState> {
    return this.transaction(async (client) => this.lockedState(client, userId, now));
  }

  async reserveGeneration(userId: string, reservationId: string, now: Date) {
    return this.transaction(async (client): Promise<GenerationReservation> => {
      const existing = await client.query<ReservationRow>(
        `SELECT id, user_id, source, access, period_start, status
         FROM generation_quota_reservations WHERE id = $1 FOR UPDATE`,
        [reservationId],
      );
      if (existing.rows[0]) return mapReservation(existing.rows[0]);

      const state = await this.lockedState(client, userId, now);
      if (!state.quota.canGenerate) throw new GenerationQuotaExhaustedError();
      const source: GenerationCreditSource =
        state.quota.includedRemaining > 0 ? 'included' : 'top-up';
      const periodStart = state.access === 'premium' ? currentPeriodStart(now) : null;
      await client.query(
        `INSERT INTO generation_quota_reservations (
           id, user_id, source, access, period_start, status
         ) VALUES ($1, $2, $3, $4, $5, 'reserved')`,
        [reservationId, userId, source, state.access, periodStart],
      );
      return { id: reservationId, userId, source, access: state.access, periodStart };
    });
  }

  async consumeReservation(reservationId: string, now: Date): Promise<GenerationConsumption> {
    return this.transaction(async (client) => {
      const result = await client.query<ReservationRow>(
        `SELECT id, user_id, source, access, period_start, status
         FROM generation_quota_reservations WHERE id = $1 FOR UPDATE`,
        [reservationId],
      );
      const reservation = result.rows[0];
      if (!reservation || reservation.status !== 'reserved') {
        throw new GenerationReservationNotFoundError('Generation reservation is not active.');
      }
      await this.lockAccount(client, reservation.user_id);
      if (reservation.source === 'top-up') {
        await client.query(
          `UPDATE generation_quota_accounts
           SET top_up_balance = top_up_balance - 1, updated_at = now()
           WHERE user_id = $1 AND top_up_balance > 0`,
          [reservation.user_id],
        );
      } else if (reservation.access === 'premium') {
        const reservedPeriod = dateKey(reservation.period_start);
        if (reservedPeriod === currentPeriodStart(now)) {
          await client.query(
            `UPDATE generation_quota_accounts
             SET premium_used = premium_used + 1, updated_at = now()
             WHERE user_id = $1`,
            [reservation.user_id],
          );
        }
      } else {
        await client.query(
          `UPDATE generation_quota_accounts
           SET free_used = free_used + 1, updated_at = now()
           WHERE user_id = $1`,
          [reservation.user_id],
        );
      }
      await client.query(
        `UPDATE generation_quota_reservations
         SET status = 'consumed', consumed_at = $2, updated_at = now()
         WHERE id = $1`,
        [reservationId, now],
      );
      return {
        source: reservation.source,
        quota: (await this.lockedState(client, reservation.user_id, now)).quota,
      };
    });
  }

  async releaseReservation(reservationId: string, now: Date) {
    await getPool().query(
      `UPDATE generation_quota_reservations
       SET status = 'released', released_at = $2, updated_at = now()
       WHERE id = $1 AND status = 'reserved'`,
      [reservationId, now],
    );
  }

  private async lockedState(client: PoolClient, userId: string, now: Date) {
    let account = await this.lockAccount(client, userId);
    const entitlement = await client.query<EntitlementRow>(
      `SELECT is_active, expires_at FROM subscription_entitlements
       WHERE user_id = $1 AND entitlement_id = $2`,
      [userId, process.env.REVENUECAT_ENTITLEMENT_ID ?? 'saraya_premium'],
    );
    const row = entitlement.rows[0];
    const expiresAt = row?.expires_at ? new Date(row.expires_at) : null;
    const access: PremiumAccess = row?.is_active && (!expiresAt || expiresAt > now)
      ? 'premium'
      : 'free';
    const periodStart = access === 'premium' ? currentPeriodStart(now) : null;
    if (periodStart && dateKey(account.premium_period_start) !== periodStart) {
      const reset = await client.query<AccountRow>(
        `UPDATE generation_quota_accounts
         SET premium_period_start = $2, premium_used = 0, updated_at = now()
         WHERE user_id = $1
         RETURNING free_used, premium_period_start, premium_used, top_up_balance`,
        [userId, periodStart],
      );
      account = reset.rows[0]!;
    }
    const reservations = await client.query<{ source: GenerationCreditSource; count: string } & QueryResultRow>(
      `SELECT source, count(*)::text AS count
       FROM generation_quota_reservations
       WHERE user_id = $1 AND status = 'reserved'
         AND (source = 'top-up' OR (access = $2 AND period_start IS NOT DISTINCT FROM $3::date))
       GROUP BY source`,
      [userId, access, periodStart],
    );
    const reserved = new Map(reservations.rows.map((item) => [item.source, Number(item.count)]));
    const limit = access === 'premium' ? PREMIUM_MONTHLY_LIMIT : FREE_LIFETIME_LIMIT;
    const used = access === 'premium' ? account.premium_used : account.free_used;
    const includedRemaining = Math.max(0, limit - used - (reserved.get('included') ?? 0));
    const topUpRemaining = Math.max(
      0,
      account.top_up_balance - (reserved.get('top-up') ?? 0),
    );
    const end = access === 'premium'
      ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString()
      : null;
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
        periodEnd: end,
      },
    } satisfies SubscriptionState;
  }

  private async lockAccount(client: PoolClient, userId: string) {
    await client.query(
      `INSERT INTO generation_quota_accounts (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId],
    );
    const result = await client.query<AccountRow>(
      `SELECT free_used, premium_period_start, premium_used, top_up_balance
       FROM generation_quota_accounts WHERE user_id = $1 FOR UPDATE`,
      [userId],
    );
    return result.rows[0]!;
  }

  private async creditTopUp(
    client: PoolClient,
    userId: string,
    transactionId: string,
    productId: string,
    eventId: string | null,
    purchasedAt: Date | null,
  ) {
    const inserted = await client.query(
      `INSERT INTO generation_top_up_transactions (
         transaction_id, user_id, product_id, credits_granted, source_event_id, purchased_at
       ) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (transaction_id) DO NOTHING RETURNING transaction_id`,
      [transactionId, userId, productId, TOP_UP_SIZE, eventId, purchasedAt],
    );
    if (inserted.rowCount === 0) return false;
    await client.query(
      `INSERT INTO generation_quota_accounts (user_id, top_up_balance)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET
         top_up_balance = generation_quota_accounts.top_up_balance + EXCLUDED.top_up_balance,
         updated_at = now()`,
      [userId, TOP_UP_SIZE],
    );
    return true;
  }

  private async applyEntitlement(
    client: PoolClient,
    userId: string,
    event: RevenueCatWebhookEvent,
    configuration: SubscriptionConfiguration,
  ): Promise<'processed' | 'ignored'> {
    const activation = new Set([
      'INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'NON_RENEWING_PURCHASE',
      'REFUND_REVERSED', 'SUBSCRIPTION_EXTENDED',
    ]);
    const deactivation = new Set(['CANCELLATION', 'EXPIRATION']);
    if (!activation.has(event.type) && !deactivation.has(event.type)) return 'ignored';
    await client.query(
      `INSERT INTO subscription_entitlements (
         user_id, entitlement_id, is_active, product_id, original_transaction_id,
         expires_at, source_event_id, last_event_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id, entitlement_id) DO UPDATE SET
         is_active = EXCLUDED.is_active,
         product_id = COALESCE(EXCLUDED.product_id, subscription_entitlements.product_id),
         original_transaction_id = COALESCE(
           EXCLUDED.original_transaction_id,
           subscription_entitlements.original_transaction_id
         ),
         expires_at = EXCLUDED.expires_at,
         source_event_id = EXCLUDED.source_event_id,
         last_event_at = EXCLUDED.last_event_at,
         updated_at = now()
       WHERE subscription_entitlements.last_event_at <= EXCLUDED.last_event_at`,
      [
        userId,
        configuration.entitlementId,
        activation.has(event.type),
        event.product_id ?? null,
        event.original_transaction_id ?? null,
        event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
        event.id,
        new Date(event.event_timestamp_ms),
      ],
    );
    return 'processed';
  }

  private async applyTransfer(
    client: PoolClient,
    event: RevenueCatWebhookEvent,
    users: Map<string, string>,
    configuration: SubscriptionConfiguration,
  ): Promise<'processed' | 'ignored'> {
    const destination = event.transferred_to.map((id) => users.get(id)).find(Boolean);
    if (!destination) return 'ignored';
    const sources = unique(event.transferred_from.map((id) => users.get(id)));
    const sourceEntitlement = sources.length > 0
      ? await client.query<EntitlementRow>(
          `SELECT is_active, expires_at, product_id, original_transaction_id
           FROM subscription_entitlements
           WHERE user_id = ANY($1::text[]) AND entitlement_id = $2 AND is_active = true
           ORDER BY last_event_at DESC LIMIT 1`,
          [sources, configuration.entitlementId],
        )
      : { rows: [] as EntitlementRow[] };
    if (sources.length > 0) {
      await client.query(
        `UPDATE subscription_entitlements
         SET is_active = false, source_event_id = $3, last_event_at = $4, updated_at = now()
         WHERE user_id = ANY($1::text[]) AND entitlement_id = $2`,
        [sources, configuration.entitlementId, event.id, new Date(event.event_timestamp_ms)],
      );
    }
    const source = sourceEntitlement.rows[0];
    const active = Boolean(source?.is_active) || event.entitlement_ids.includes(configuration.entitlementId);
    await client.query(
      `INSERT INTO subscription_entitlements (
         user_id, entitlement_id, is_active, product_id, original_transaction_id,
         expires_at, source_event_id, last_event_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id, entitlement_id) DO UPDATE SET
         is_active = EXCLUDED.is_active,
         product_id = COALESCE(EXCLUDED.product_id, subscription_entitlements.product_id),
         original_transaction_id = COALESCE(
           EXCLUDED.original_transaction_id,
           subscription_entitlements.original_transaction_id
         ),
         expires_at = EXCLUDED.expires_at,
         source_event_id = EXCLUDED.source_event_id,
         last_event_at = EXCLUDED.last_event_at,
         updated_at = now()`,
      [
        destination,
        configuration.entitlementId,
        active,
        event.product_id ?? source?.product_id ?? null,
        event.original_transaction_id ?? source?.original_transaction_id ?? null,
        event.expiration_at_ms ? new Date(event.expiration_at_ms) : source?.expires_at ?? null,
        event.id,
        new Date(event.event_timestamp_ms),
      ],
    );
    return 'processed';
  }

  private async findAssociatedUsers(client: PoolClient, customerIds: string[]) {
    if (customerIds.length === 0) return new Map<string, string>();
    const result = await client.query<{ revenuecat_customer_id: string; user_id: string } & QueryResultRow>(
      `SELECT revenuecat_customer_id, user_id FROM revenuecat_customers
       WHERE revenuecat_customer_id = ANY($1::text[])`,
      [customerIds],
    );
    return new Map(result.rows.map((row) => [row.revenuecat_customer_id, row.user_id]));
  }

  private async transaction<T>(operation: (client: PoolClient) => Promise<T>) {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

function unique(values: Array<string | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function dateKey(value: Date | string | null) {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
}

function mapReservation(row: ReservationRow): GenerationReservation {
  return {
    id: row.id,
    userId: row.user_id,
    source: row.source,
    access: row.access,
    periodStart: dateKey(row.period_start),
  };
}
