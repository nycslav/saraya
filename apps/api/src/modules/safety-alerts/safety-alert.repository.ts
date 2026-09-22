import type {
  Coordinates,
  ResolvedLocation,
  SafetyAlert,
  SafetyAlertQuery,
} from '@saraya/contracts';

import { hasDatabaseConfiguration } from '../../platform/database/pool';
import { seedDestinations } from '../destinations/destination.seed';
import { PostgresSafetyAlertRepository } from './safety-alert.postgres-repository';
import { seedSafetyAlerts } from './safety-alert.seed';

export interface SafetyAlertRepository {
  findActive(location: ResolvedLocation, filters: Pick<SafetyAlertQuery, 'severity' | 'alertType'>, now: Date): Promise<SafetyAlert[]>;
  findById(id: string): Promise<SafetyAlert | null>;
  resolveDestination(id: string): Promise<ResolvedLocation | null>;
  resolveCoordinates(coordinates: Coordinates): Promise<ResolvedLocation>;
}

function squaredDistance(left: Coordinates, right: Coordinates) {
  return (left.latitude - right.latitude) ** 2 + (left.longitude - right.longitude) ** 2;
}

function pointInRing(point: Coordinates, ring: [number, number][]) {
  let inside = false;
  for (let current = 0, previous = ring.length - 1; current < ring.length; previous = current++) {
    const [currentX = 0, currentY = 0] = ring[current] ?? [];
    const [previousX = 0, previousY = 0] = ring[previous] ?? [];
    const intersects = currentY > point.latitude !== previousY > point.latitude &&
      point.longitude < ((previousX - currentX) * (point.latitude - currentY)) / (previousY - currentY) + currentX;
    if (intersects) inside = !inside;
  }
  return inside;
}

function affectsCoordinates(alert: SafetyAlert, coordinates: Coordinates) {
  return alert.affectedArea?.coordinates.some((polygon) =>
    polygon[0] ? pointInRing(coordinates, polygon[0]) : false,
  ) ?? false;
}

export class InMemorySafetyAlertRepository implements SafetyAlertRepository {
  constructor(private readonly alerts: SafetyAlert[] = seedSafetyAlerts) {}

  async findActive(
    location: ResolvedLocation,
    filters: Pick<SafetyAlertQuery, 'severity' | 'alertType'>,
    now: Date,
  ) {
    return this.alerts.filter((alert) => {
      const isActive = new Date(alert.startsAt) <= now && (!alert.endsAt || new Date(alert.endsAt) > now);
      const matchesLocation = location.coordinates
        ? alert.affectedArea
          ? affectsCoordinates(alert, location.coordinates)
          : alert.affectedRegions.includes(location.region)
        : alert.affectedRegions.includes(location.region);
      return isActive && matchesLocation &&
        (!filters.severity || alert.severity === filters.severity) &&
        (!filters.alertType || alert.alertType === filters.alertType);
    });
  }

  async findById(id: string) {
    return this.alerts.find((alert) => alert.id === id) ?? null;
  }

  async resolveDestination(id: string): Promise<ResolvedLocation | null> {
    const destination = seedDestinations.find((item) => item.id === id);
    return destination ? {
      kind: 'destination',
      label: destination.name,
      region: destination.region,
      destinationId: destination.id,
      coordinates: destination.coordinates,
    } : null;
  }

  async resolveCoordinates(coordinates: Coordinates): Promise<ResolvedLocation> {
    const nearest = [...seedDestinations].sort(
      (left, right) => squaredDistance(left.coordinates, coordinates) - squaredDistance(right.coordinates, coordinates),
    )[0];
    return {
      kind: 'coordinates',
      label: 'your current location',
      region: nearest?.region ?? 'Unknown region',
      coordinates,
    };
  }
}

export function createSafetyAlertRepository(): SafetyAlertRepository {
  return process.env.NODE_ENV !== 'test' && hasDatabaseConfiguration()
    ? new PostgresSafetyAlertRepository()
    : new InMemorySafetyAlertRepository();
}
