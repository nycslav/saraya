import { safetyAlertSchema } from '@saraya/contracts';

import { createWarningProvider, type WarningProvider } from '../../integrations/warnings';
import { DestinationSafetyService } from '../destination-safety/destination-safety.service';
import { createSafetyAlertRepository, type SafetyAlertRepository } from './safety-alert.repository';

type SubscriberNotifier = Pick<DestinationSafetyService, 'notifySubscribers'>;

export type WarningIngestionResult = {
  fetched: number;
  changed: number;
  expired: number;
  notificationsAttempted: number;
  notificationFailures: number;
  demoSkipped: boolean;
};

export class WarningIngestionService {
  constructor(
    private readonly provider: WarningProvider = createWarningProvider(),
    private readonly repository: SafetyAlertRepository = createSafetyAlertRepository(),
    private readonly notifier: SubscriberNotifier = new DestinationSafetyService(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  async ingest(): Promise<WarningIngestionResult> {
    const checkedAt = this.now();
    if (this.provider.source.isDemo) {
      return {
        fetched: 0, changed: 0, expired: 0, notificationsAttempted: 0,
        notificationFailures: 0, demoSkipped: true,
      };
    }

    try {
      const alerts = (await this.provider.getActiveWarnings()).map((alert) => safetyAlertSchema.parse(alert));
      if (alerts.some(({ source }) => source.isDemo || source.provider !== this.provider.source.provider)) {
        throw new Error('Warning provider returned an invalid source identity.');
      }

      let changed = 0;
      let notificationsAttempted = 0;
      let notificationFailures = 0;
      for (const alert of alerts) {
        if (!(await this.repository.upsertFromProvider(alert))) continue;
        changed += 1;
        const active = new Date(alert.startsAt) <= checkedAt && (
          !alert.endsAt || new Date(alert.endsAt) > checkedAt
        );
        if (!active) continue;
        notificationsAttempted += 1;
        try {
          await this.notifier.notifySubscribers(alert);
        } catch {
          notificationFailures += 1;
          console.error(`[warning-ingestion] Notification dispatch failed for ${alert.id}.`);
        }
      }
      const expired = await this.repository.expireMissing(
        this.provider.source.provider,
        alerts.map(({ id }) => id),
        checkedAt,
      );
      await this.repository.recordProviderSuccess(this.provider.source.provider, checkedAt);

      return {
        fetched: alerts.length,
        changed,
        expired,
        notificationsAttempted,
        notificationFailures,
        demoSkipped: false,
      };
    } catch (error) {
      try {
        await this.repository.recordProviderFailure(
          this.provider.source.provider,
          checkedAt,
          error instanceof Error ? error.name : 'UNKNOWN_PROVIDER_ERROR',
        );
      } catch {
        // Preserve the original provider/ingestion failure for job observability.
      }
      throw error;
    }
  }
}
