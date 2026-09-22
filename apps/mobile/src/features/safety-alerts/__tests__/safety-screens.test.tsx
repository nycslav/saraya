import type { SafetyAlertGateway } from '../gateways';
import type { ForegroundLocationProvider } from '@/core/location';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { FixtureSafetyAlertGateway } from '../gateways';
import { SafetyAlertDetailScreen } from '../screens/SafetyAlertDetailScreen';
import { SafetyAlertListScreen } from '../screens/SafetyAlertListScreen';

const mockBack = jest.fn();
const mockPush = jest.fn();
let mockAlertId = 'demo-bicol-severe-weather';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: mockAlertId }),
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));

describe('safety alert mobile screens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAlertId = 'demo-bicol-severe-weather';
  });

  it('does not request location on startup and keeps manual choices visible', async () => {
    const locationProvider: ForegroundLocationProvider = {
      requestForegroundPermission: jest.fn(),
      getCurrentCoordinates: jest.fn(),
    };
    await render(<SafetyAlertListScreen gateway={new FixtureSafetyAlertGateway()} locationProvider={locationProvider} />);

    expect(locationProvider.requestForegroundPermission).not.toHaveBeenCalled();
    expect(screen.getByText('No location selected')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Bicol Region' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cebu City' })).toBeTruthy();
  });

  it('loads region alerts, severity labels, demo disclosure, and detail navigation', async () => {
    await render(<SafetyAlertListScreen gateway={new FixtureSafetyAlertGateway()} />);
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Bicol Region' }));
    });

    expect(await screen.findByText('Showing alerts for Bicol Region')).toBeTruthy();
    expect(screen.getByText(/RED.*High-risk disruption/)).toBeTruthy();
    expect(screen.getAllByText(/SYNTHETIC DEMO DATA/).length).toBeGreaterThan(0);
    fireEvent.press(screen.getByRole('button', { name: /RED alert:.*Severe storm/i }));
    expect(mockPush).toHaveBeenCalledWith('/alerts/demo-bicol-severe-weather');
  });

  it('uses a one-time current location after explicit action', async () => {
    const locationProvider: ForegroundLocationProvider = {
      requestForegroundPermission: jest.fn().mockResolvedValue('granted'),
      getCurrentCoordinates: jest.fn().mockResolvedValue({ latitude: 14.6, longitude: 121 }),
    };
    await render(<SafetyAlertListScreen gateway={new FixtureSafetyAlertGateway()} locationProvider={locationProvider} />);
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Use my current location' }));
    });

    expect(await screen.findByText('Showing alerts near your current location')).toBeTruthy();
    expect(locationProvider.getCurrentCoordinates).toHaveBeenCalledTimes(1);
  });

  it('keeps manual fallback after permission denial', async () => {
    const locationProvider: ForegroundLocationProvider = {
      requestForegroundPermission: jest.fn().mockResolvedValue('denied'),
      getCurrentCoordinates: jest.fn(),
    };
    await render(<SafetyAlertListScreen gateway={new FixtureSafetyAlertGateway()} locationProvider={locationProvider} />);
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Use my current location' }));
    });

    expect(await screen.findByText(/Location permission was denied/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Central Visayas' })).toBeTruthy();
    expect(locationProvider.getCurrentCoordinates).not.toHaveBeenCalled();
  });

  it('supports manual destination selection and an empty result', async () => {
    const destination = await render(<SafetyAlertListScreen gateway={new FixtureSafetyAlertGateway()} />);
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Cebu City' }));
    });
    expect(await screen.findByText('Showing alerts for Cebu City')).toBeTruthy();
    await destination.unmount();

    const emptyGateway: SafetyAlertGateway = {
      list: jest.fn().mockResolvedValue({ location: { kind: 'region', label: 'Ilocos Region', region: 'Ilocos Region' }, alerts: [] }),
      getById: jest.fn(),
      getWeather: jest.fn().mockRejectedValue(new Error('unavailable')),
    };
    const empty = await render(<SafetyAlertListScreen gateway={emptyGateway} />);
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Bicol Region' }));
    });
    expect(await screen.findByText('No active alerts in this dataset')).toBeTruthy();
    await empty.unmount();
  });

  it('shows loading, error, and retry states', async () => {
    let rejectRequest: ((error: Error) => void) | undefined;
    const list = jest.fn()
      .mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectRequest = reject; }))
      .mockResolvedValueOnce({ location: { kind: 'region', label: 'Bicol Region', region: 'Bicol Region' }, alerts: [] });
    const gateway: SafetyAlertGateway = {
      list,
      getById: jest.fn(),
      getWeather: jest.fn().mockRejectedValue(new Error('unavailable')),
    };
    await render(<SafetyAlertListScreen gateway={gateway} />);
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Bicol Region' }));
      await Promise.resolve();
    });
    expect(screen.getByText(/Checking safety information/)).toBeTruthy();
    await act(async () => {
      rejectRequest?.(new Error('offline'));
      await Promise.resolve();
    });
    expect(await screen.findByText('Safety information unavailable')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
      await Promise.resolve();
    });
    expect(list).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('No active alerts in this dataset')).toBeTruthy();
  });

  it('renders complete alert details and explicit demo context', async () => {
    await render(<SafetyAlertDetailScreen gateway={new FixtureSafetyAlertGateway()} />);

    expect(await screen.findByRole('header', { name: /Severe storm conditions/ })).toBeTruthy();
    expect(screen.getByText('Affected area')).toBeTruthy();
    expect(screen.getByText('Traveler recommendations')).toBeTruthy();
    expect(screen.getByText('Alternatives')).toBeTruthy();
    expect(screen.getByText('Synthetic demonstration alert')).toBeTruthy();
    expect(screen.getByText('Saraya synthetic safety dataset')).toBeTruthy();
  });
});
