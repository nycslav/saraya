import {
  safetyAlertQuerySchema,
  weatherQuerySchema,
  weatherResponseSchema,
  type ResolvedLocation,
  type SafetyAlert,
  type SafetyAlertQuery,
  type WeatherQuery,
} from '@saraya/contracts';

import { createPagasaProvider, type PagasaProvider } from '../../integrations/pagasa';
import {
  createSafetyAlertRepository,
  type SafetyAlertRepository,
} from './safety-alert.repository';

export class SafetyDestinationNotFoundError extends Error {
  constructor() {
    super('Destination not found.');
    this.name = 'SafetyDestinationNotFoundError';
  }
}

const severityPriority = { red: 3, yellow: 2, green: 1 } as const;

function sortAlerts(alerts: SafetyAlert[]) {
  return [...alerts].sort((left, right) =>
    severityPriority[right.severity] - severityPriority[left.severity] ||
    new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime() ||
    left.title.localeCompare(right.title),
  );
}

export class SafetyAlertService {
  constructor(
    private readonly repository: SafetyAlertRepository = createSafetyAlertRepository(),
    private readonly provider: PagasaProvider = createPagasaProvider(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  private async resolveLocation(query: WeatherQuery | SafetyAlertQuery): Promise<ResolvedLocation> {
    if (query.region) return { kind: 'region', label: query.region, region: query.region };
    if (query.destinationId) {
      const destination = await this.repository.resolveDestination(query.destinationId);
      if (!destination) throw new SafetyDestinationNotFoundError();
      return destination;
    }
    return this.repository.resolveCoordinates({
      latitude: query.latitude!,
      longitude: query.longitude!,
    });
  }

  async list(rawQuery: unknown) {
    const query = safetyAlertQuerySchema.parse(rawQuery);
    const location = await this.resolveLocation(query);
    const persisted = await this.repository.findActive(location, query, this.now());
    let warnings: SafetyAlert[] = [];
    try {
      warnings = await this.provider.getActiveWarnings(location);
    } catch {
      // Persisted alerts remain useful when a future live provider is unavailable.
    }
    const currentTime = this.now().getTime();
    const filteredWarnings = warnings.filter((alert) =>
      new Date(alert.startsAt).getTime() <= currentTime &&
      (!alert.endsAt || new Date(alert.endsAt).getTime() > currentTime) &&
      (!query.severity || alert.severity === query.severity) &&
      (!query.alertType || alert.alertType === query.alertType),
    );
    return {
      location,
      alerts: sortAlerts([...new Map([...persisted, ...filteredWarnings].map((alert) => [alert.id, alert])).values()]),
    };
  }

  getById(id: string) {
    return this.repository.findById(id);
  }

  async weather(rawQuery: unknown) {
    const query = weatherQuerySchema.parse(rawQuery);
    const location = await this.resolveLocation(query);
    try {
      return await this.provider.getWeather(location);
    } catch {
      return weatherResponseSchema.parse({
        location,
        condition: null,
        temperatureCelsius: null,
        precipitationProbability: null,
        rainfallMillimeters: null,
        warningState: 'unavailable',
        summary: 'Weather data is unavailable. Saraya has not assumed that conditions are safe.',
        observedAt: null,
        providerStatus: 'unavailable',
        source: {
          provider: 'configured-weather-provider',
          name: 'Configured weather provider unavailable',
          isDemo: process.env.PAGASA_PROVIDER !== 'real',
        },
      });
    }
  }
}
