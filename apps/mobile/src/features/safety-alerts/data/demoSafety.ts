import {
  safetyAlertSchema,
  weatherResponseSchema,
  type ResolvedLocation,
  type SafetyAlert,
  type SafetyAlertQuery,
  type WeatherQuery,
} from '@saraya/contracts';
import { z } from 'zod';

import safetyAlertSeeds from '../../../../../../database/seeds/safety-alerts.json';

export const demoSafetyAlerts = z.array(safetyAlertSchema).parse(safetyAlertSeeds);

export const safetyRegions = [
  'Bicol Region',
  'National Capital Region',
  'Central Visayas',
  'Davao Region',
  'Cordillera Administrative Region',
] as const;

export const safetyDestinations = [
  { id: 'intramuros', name: 'Intramuros', region: 'National Capital Region', latitude: 14.5896, longitude: 120.9747 },
  { id: 'cebu-city', name: 'Cebu City', region: 'Central Visayas', latitude: 10.3157, longitude: 123.8854 },
  { id: 'davao-city', name: 'Davao City', region: 'Davao Region', latitude: 7.1907, longitude: 125.4553 },
  { id: 'baguio', name: 'Baguio', region: 'Cordillera Administrative Region', latitude: 16.4023, longitude: 120.596 },
] as const;

function resolveDemoLocation(query: WeatherQuery | SafetyAlertQuery): ResolvedLocation {
  if (query.region) return { kind: 'region', label: query.region, region: query.region };
  if (query.destinationId) {
    const destination = safetyDestinations.find((item) => item.id === query.destinationId);
    if (!destination) throw new Error('Destination not found.');
    return {
      kind: 'destination', label: destination.name, region: destination.region,
      destinationId: destination.id,
      coordinates: { latitude: destination.latitude, longitude: destination.longitude },
    };
  }
  const latitude = query.latitude!;
  const longitude = query.longitude!;
  const region = latitude >= 9.5 && latitude <= 10.65 && longitude >= 123.65 && longitude <= 124.25
    ? 'Central Visayas'
    : latitude >= 14.45 && latitude <= 14.82 && longitude >= 120.85 && longitude <= 121.15
      ? 'National Capital Region'
      : 'Davao Region';
  return { kind: 'coordinates', label: 'your current location', region, coordinates: { latitude, longitude } };
}

export function listDemoAlerts(query: SafetyAlertQuery, now = new Date('2026-09-22T12:00:00.000Z')) {
  const location = resolveDemoLocation(query);
  const alerts = demoSafetyAlerts.filter((alert) =>
    new Date(alert.startsAt) <= now && (!alert.endsAt || new Date(alert.endsAt) > now) &&
    alert.affectedRegions.includes(location.region) &&
    (!query.severity || alert.severity === query.severity) &&
    (!query.alertType || alert.alertType === query.alertType),
  );
  return { location, alerts };
}

export function getDemoWeather(query: WeatherQuery) {
  const location = resolveDemoLocation(query);
  return weatherResponseSchema.parse({
    location,
    condition: location.region === 'Central Visayas' ? 'Partly cloudy demonstration conditions' : 'Variable demonstration conditions',
    temperatureCelsius: location.region === 'Cordillera Administrative Region' ? 19 : 29,
    relativeHumidityPercent: 72,
    apparentTemperatureCelsius: location.region === 'Cordillera Administrative Region' ? 18 : 32,
    precipitationProbability: location.region === 'National Capital Region' ? 70 : 40,
    precipitationMillimeters: location.region === 'National Capital Region' ? 8.4 : 2,
    rainfallMillimeters: location.region === 'National Capital Region' ? 8.4 : 2,
    windSpeedKilometersPerHour: 12,
    windDirectionDegrees: 90,
    warningState: location.region === 'National Capital Region' || location.region === 'Bicol Region' ? 'advisory' : 'no-warning',
    summary: 'DEMO weather from Saraya’s deterministic offline provider. Verify real conditions before travel.',
    observedAt: '2026-09-22T08:00:00.000Z',
    fetchedAt: '2026-09-22T08:01:00.000Z',
    providerStatus: 'fresh',
    source: { provider: 'saraya-mobile-demo', name: 'Saraya deterministic mobile fixture', isDemo: true },
  });
}

export function findDemoAlert(id: string): SafetyAlert | null {
  return demoSafetyAlerts.find((alert) => alert.id === id) ?? null;
}
