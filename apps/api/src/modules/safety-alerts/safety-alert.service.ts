import {
  destinationConditionsSchema,
  safetyAlertQuerySchema,
  weatherQuerySchema,
  weatherResponseSchema,
  type ResolvedLocation,
  type SafetyAlert,
  type SafetyAlertQuery,
  type WeatherQuery,
} from '@saraya/contracts';

import { createWarningProvider } from '../../integrations/warnings';
import { createWeatherProvider, type WeatherProvider } from '../../integrations/weather';
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
    private readonly weatherProvider: WeatherProvider = createWeatherProvider(),
    private readonly now: () => Date = () => new Date(),
    private readonly warningProviderName: string = createWarningProvider().source.provider,
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

  private async resolveWeatherLocation(query: WeatherQuery): Promise<ResolvedLocation> {
    if (query.region) return this.repository.resolveRegion(query.region);
    return this.resolveLocation(query);
  }

  async list(rawQuery: unknown) {
    const query = safetyAlertQuerySchema.parse(rawQuery);
    const location = await this.resolveLocation(query);
    const persisted = await this.repository.findActive(location, query, this.now());
    return {
      location,
      alerts: sortAlerts(persisted),
    };
  }

  getById(id: string) {
    return this.repository.findById(id);
  }

  async weather(rawQuery: unknown) {
    const query = weatherQuerySchema.parse(rawQuery);
    const location = await this.resolveWeatherLocation(query);
    try {
      return await this.weatherProvider.getWeather(location);
    } catch {
      return weatherResponseSchema.parse({
        location,
        condition: null,
        temperatureCelsius: null,
        relativeHumidityPercent: null,
        apparentTemperatureCelsius: null,
        precipitationProbability: null,
        precipitationMillimeters: null,
        rainfallMillimeters: null,
        windSpeedKilometersPerHour: null,
        windDirectionDegrees: null,
        warningState: 'unavailable',
        summary: 'Weather data is unavailable. Saraya has not assumed that conditions are safe.',
        observedAt: null,
        fetchedAt: this.now().toISOString(),
        providerStatus: 'unavailable',
        source: this.weatherProvider.source,
      });
    }
  }

  async destinationConditions(rawDestinationId: unknown) {
    const destinationId = typeof rawDestinationId === 'string' ? rawDestinationId : '';
    const [alertResult, weather, warningProviderStatus] = await Promise.all([
      this.list({ destinationId }),
      this.weather({ destinationId }),
      this.repository.getWarningProviderStatus(this.warningProviderName),
    ]);
    return destinationConditionsSchema.parse({
      destination: alertResult.location,
      weather,
      safetyAlerts: alertResult.alerts,
      warningProviderStatus,
      fetchedAt: this.now().toISOString(),
    });
  }
}
