import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  GenerationConsumption,
  GenerationQuota,
  PremiumAccess,
} from '@saraya/contracts';

import {
  GenerationQuotaExhaustedError,
  type GenerationQuotaGateway,
} from '../gateways/generation-quota.gateway';

const QUOTA_KEY = '@saraya/demo-generation-quota-v1';
const FREE_LIFETIME_LIMIT = 3;
const PREMIUM_MONTHLY_LIMIT = 10;
const TOP_UP_SIZE = 10;

type QuotaLedger = {
  freeUsed: number;
  premiumPeriod: string;
  premiumUsed: number;
  topUpBalance: number;
  processedTopUpTransactions: string[];
};

export interface QuotaStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

const emptyLedger = (): QuotaLedger => ({
  freeUsed: 0,
  premiumPeriod: '',
  premiumUsed: 0,
  topUpBalance: 0,
  processedTopUpTransactions: [],
});

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthBounds(date: Date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  return {
    start: new Date(Date.UTC(year, month, 1)).toISOString(),
    end: new Date(Date.UTC(year, month + 1, 1)).toISOString(),
  };
}

function normalizeLedger(value: unknown): QuotaLedger {
  if (!value || typeof value !== 'object') return emptyLedger();
  const candidate = value as Partial<QuotaLedger>;
  return {
    freeUsed: Number.isInteger(candidate.freeUsed) && (candidate.freeUsed ?? -1) >= 0 ? candidate.freeUsed! : 0,
    premiumPeriod: typeof candidate.premiumPeriod === 'string' ? candidate.premiumPeriod : '',
    premiumUsed: Number.isInteger(candidate.premiumUsed) && (candidate.premiumUsed ?? -1) >= 0 ? candidate.premiumUsed! : 0,
    topUpBalance: Number.isInteger(candidate.topUpBalance) && (candidate.topUpBalance ?? -1) >= 0 ? candidate.topUpBalance! : 0,
    processedTopUpTransactions: Array.isArray(candidate.processedTopUpTransactions)
      ? candidate.processedTopUpTransactions.filter((id): id is string => typeof id === 'string')
      : [],
  };
}

export class LocalGenerationQuotaGateway implements GenerationQuotaGateway {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly storage: QuotaStorage = AsyncStorage,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private serialize<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.queue.then(operation, operation);
    this.queue = next.then(() => undefined, () => undefined);
    return next;
  }

  private async load() {
    const raw = await this.storage.getItem(QUOTA_KEY);
    if (!raw) return emptyLedger();
    try {
      return normalizeLedger(JSON.parse(raw));
    } catch {
      return emptyLedger();
    }
  }

  private async save(ledger: QuotaLedger) {
    await this.storage.setItem(QUOTA_KEY, JSON.stringify(ledger));
  }

  private resetPremiumPeriod(ledger: QuotaLedger, date: Date) {
    const currentPeriod = monthKey(date);
    if (ledger.premiumPeriod === currentPeriod) return false;
    ledger.premiumPeriod = currentPeriod;
    ledger.premiumUsed = 0;
    return true;
  }

  private snapshot(access: PremiumAccess, ledger: QuotaLedger, date: Date): GenerationQuota {
    const premium = access === 'premium';
    const includedLimit = premium ? PREMIUM_MONTHLY_LIMIT : FREE_LIFETIME_LIMIT;
    const used = premium ? ledger.premiumUsed : ledger.freeUsed;
    const bounds = premium ? monthBounds(date) : null;
    const includedRemaining = Math.max(0, includedLimit - used);
    return {
      access,
      includedLimit,
      includedRemaining,
      topUpRemaining: ledger.topUpBalance,
      canGenerate: includedRemaining + ledger.topUpBalance > 0,
      canRegenerate: premium && includedRemaining + ledger.topUpBalance > 0,
      periodStart: bounds?.start ?? null,
      periodEnd: bounds?.end ?? null,
    };
  }

  getQuota(access: PremiumAccess) {
    return this.serialize(async () => {
      const ledger = await this.load();
      const date = this.now();
      if (access === 'premium' && this.resetPremiumPeriod(ledger, date)) await this.save(ledger);
      return this.snapshot(access, ledger, date);
    });
  }

  consumeAfterSuccess(access: PremiumAccess): Promise<GenerationConsumption> {
    return this.serialize(async () => {
      const ledger = await this.load();
      const date = this.now();
      if (access === 'premium') this.resetPremiumPeriod(ledger, date);
      const includedLimit = access === 'premium' ? PREMIUM_MONTHLY_LIMIT : FREE_LIFETIME_LIMIT;
      const includedUsed = access === 'premium' ? ledger.premiumUsed : ledger.freeUsed;
      let source: GenerationConsumption['source'];
      if (includedUsed < includedLimit) {
        source = 'included';
        if (access === 'premium') ledger.premiumUsed += 1;
        else ledger.freeUsed += 1;
      } else if (ledger.topUpBalance > 0) {
        source = 'top-up';
        ledger.topUpBalance -= 1;
      } else {
        throw new GenerationQuotaExhaustedError();
      }
      await this.save(ledger);
      return { source, quota: this.snapshot(access, ledger, date) };
    });
  }

  creditTopUp(access: PremiumAccess, transactionId: string) {
    return this.serialize(async () => {
      if (!transactionId) throw new Error('A store transaction ID is required to credit generations.');
      const ledger = await this.load();
      const date = this.now();
      if (access === 'premium') this.resetPremiumPeriod(ledger, date);
      const credited = !ledger.processedTopUpTransactions.includes(transactionId);
      if (credited) {
        ledger.topUpBalance += TOP_UP_SIZE;
        ledger.processedTopUpTransactions.push(transactionId);
        await this.save(ledger);
      }
      return { credited, quota: this.snapshot(access, ledger, date) };
    });
  }
}

