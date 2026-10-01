import * as Location from 'expo-location';

import type { Coordinates } from '@saraya/contracts';

export type ForegroundPermissionResult = 'granted' | 'denied' | 'unavailable';
export type ForegroundLocationResult =
  | { status: 'success'; coordinates: Coordinates }
  | { status: 'denied' | 'unavailable' | 'error' };

export interface ForegroundLocationProvider {
  requestForegroundPermission(): Promise<ForegroundPermissionResult>;
  getCurrentCoordinates(): Promise<Coordinates>;
}

export class ExpoForegroundLocationProvider implements ForegroundLocationProvider {
  async requestForegroundPermission(): Promise<ForegroundPermissionResult> {
    if (!(await Location.hasServicesEnabledAsync())) return 'unavailable';
    const permission = await Location.requestForegroundPermissionsAsync();
    return permission.status === Location.PermissionStatus.GRANTED ? 'granted' : 'denied';
  }

  async getCurrentCoordinates(): Promise<Coordinates> {
    const result = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: result.coords.latitude,
      longitude: result.coords.longitude,
    };
  }
}

export async function requestForegroundLocation(
  provider: ForegroundLocationProvider = new ExpoForegroundLocationProvider(),
): Promise<ForegroundLocationResult> {
  try {
    const permission = await provider.requestForegroundPermission();
    if (permission !== 'granted') return { status: permission };
    return { status: 'success', coordinates: await provider.getCurrentCoordinates() };
  } catch {
    return { status: 'error' };
  }
}
