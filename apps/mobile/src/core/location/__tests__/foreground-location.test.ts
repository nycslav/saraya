import * as Location from 'expo-location';

import {
  ExpoForegroundLocationProvider,
  requestForegroundLocation,
  type ForegroundLocationProvider,
} from '../foreground-location';

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  PermissionStatus: { GRANTED: 'granted' },
  hasServicesEnabledAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const hasServices = Location.hasServicesEnabledAsync as jest.Mock;
const requestPermission = Location.requestForegroundPermissionsAsync as jest.Mock;
const getPosition = Location.getCurrentPositionAsync as jest.Mock;

describe('foreground location boundary', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requests foreground permission and acquires one location', async () => {
    hasServices.mockResolvedValue(true);
    requestPermission.mockResolvedValue({ status: 'granted' });
    getPosition.mockResolvedValue({ coords: { latitude: 14.6, longitude: 121 } });

    await expect(requestForegroundLocation(new ExpoForegroundLocationProvider())).resolves.toEqual({
      status: 'success', coordinates: { latitude: 14.6, longitude: 121 },
    });
    expect(getPosition).toHaveBeenCalledTimes(1);
    expect(getPosition).toHaveBeenCalledWith({ accuracy: Location.Accuracy.Balanced });
  });

  it('returns unavailable without asking for permission when services are off', async () => {
    hasServices.mockResolvedValue(false);
    await expect(requestForegroundLocation(new ExpoForegroundLocationProvider())).resolves.toEqual({ status: 'unavailable' });
    expect(requestPermission).not.toHaveBeenCalled();
    expect(getPosition).not.toHaveBeenCalled();
  });

  it('does not acquire coordinates after permission denial', async () => {
    hasServices.mockResolvedValue(true);
    requestPermission.mockResolvedValue({ status: 'denied' });
    await expect(requestForegroundLocation(new ExpoForegroundLocationProvider())).resolves.toEqual({ status: 'denied' });
    expect(getPosition).not.toHaveBeenCalled();
  });

  it('normalizes coordinate acquisition failures', async () => {
    const provider: ForegroundLocationProvider = {
      requestForegroundPermission: jest.fn().mockResolvedValue('granted'),
      getCurrentCoordinates: jest.fn().mockRejectedValue(new Error('GPS timeout')),
    };
    await expect(requestForegroundLocation(provider)).resolves.toEqual({ status: 'error' });
  });
});
