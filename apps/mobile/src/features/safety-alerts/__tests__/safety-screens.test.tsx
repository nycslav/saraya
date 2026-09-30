import type { SafetyAlertGateway, SafetySubscriptionGateway } from '../gateways';
import type { ForegroundLocationProvider } from '@/core/location';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { NotificationGateway } from '@/features/notifications/gateway';
import { Linking } from 'react-native';

import { FixtureSafetyAlertGateway } from '../gateways';
import { SafetyAlertDetailScreen } from '../screens/SafetyAlertDetailScreen';
import { SafetyAlertListScreen } from '../screens/SafetyAlertListScreen';

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockAlertId = 'demo-bicol-severe-weather';
let mockUser: { id: string } | null = null;
let mockPreview = false;
let mockCanGoBack = true;

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: mockAlertId }),
  useRouter: () => ({ back: mockBack, push: mockPush, replace: mockReplace, canGoBack: () => mockCanGoBack }),
}));

jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ user: mockUser, isDevelopmentPreview: mockPreview }),
}));

jest.mock('@/features/notifications/gateway', () => ({
  notificationGateway: { enable: jest.fn() },
}));

describe('safety alert mobile screens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAlertId = 'demo-bicol-severe-weather';
    mockUser = null;
    mockPreview = false;
    mockCanGoBack = true;
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
    expect(screen.getAllByText(/SAMPLE INFORMATION/).length).toBeGreaterThan(0);
    fireEvent.press(screen.getByRole('button', { name: /RED alert:.*Severe storm/i }));
    expect(mockPush).toHaveBeenCalledWith('/alerts/demo-bicol-severe-weather');
  });

  it('uses a one-time current location after explicit action', async () => {
    const locationProvider: ForegroundLocationProvider = {
      requestForegroundPermission: jest.fn().mockResolvedValue('granted'),
      getCurrentCoordinates: jest.fn().mockResolvedValue({ latitude: 14.6, longitude: 121 }),
    };
    await render(<SafetyAlertListScreen gateway={new FixtureSafetyAlertGateway()} locationProvider={locationProvider} />);
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Use my current location' })); });
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Continue with location' })); });

    expect(await screen.findByText('Showing alerts near your current location')).toBeTruthy();
    expect(locationProvider.getCurrentCoordinates).toHaveBeenCalledTimes(1);
  });

  it('keeps manual fallback after permission denial', async () => {
    const locationProvider: ForegroundLocationProvider = {
      requestForegroundPermission: jest.fn().mockResolvedValue('denied'),
      getCurrentCoordinates: jest.fn(),
    };
    await render(<SafetyAlertListScreen gateway={new FixtureSafetyAlertGateway()} locationProvider={locationProvider} />);
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Use my current location' })); });
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Continue with location' })); });

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
    expect(await screen.findByText('No active alerts found')).toBeTruthy();
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
    expect(await screen.findByText('No active alerts found')).toBeTruthy();
  });

  it('renders complete alert details and explicit demo context', async () => {
    await render(<SafetyAlertDetailScreen gateway={new FixtureSafetyAlertGateway()} />);

    expect(await screen.findByRole('header', { name: /Severe storm conditions/ })).toBeTruthy();
    expect(screen.getByText('Affected area')).toBeTruthy();
    expect(screen.getByText('Traveler recommendations')).toBeTruthy();
    expect(screen.getByText('Alternatives')).toBeTruthy();
    expect(screen.getByText('Sample safety information')).toBeTruthy();
    expect(screen.getByText('Saraya sample safety information')).toBeTruthy();
    expect(screen.getByText('This example is included to show how safety alerts work.')).toBeTruthy();
  });

  it('requests notifications only when a signed-in user follows a region', async () => {
    mockUser = { id: 'user-1' };
    const subscriptions = {
      get: jest.fn().mockResolvedValue({ scope: 'region', key: 'Bicol Region', subscribed: false }),
      subscribe: jest.fn().mockResolvedValue({ scope: 'region', key: 'Bicol Region', subscribed: true }),
      unsubscribe: jest.fn(),
    } as unknown as SafetySubscriptionGateway;
    const notifications = {
      enable: jest.fn().mockResolvedValue({ safetyAlertsEnabled: true, festivalRemindersEnabled: false }),
    } as unknown as NotificationGateway;
    await render(<SafetyAlertListScreen gateway={new FixtureSafetyAlertGateway()} notifications={notifications} subscriptions={subscriptions} />);

    expect(notifications.enable).not.toHaveBeenCalled();
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Bicol Region' })); });
    const followRegion = await screen.findByRole('button', { name: 'Follow this place' });
    await act(async () => { fireEvent.press(followRegion); });

    expect(await screen.findByText(/receive important safety updates for Bicol Region/)).toBeTruthy();
    expect(notifications.enable).toHaveBeenCalledWith({ safetyAlertsEnabled: true });
    expect(subscriptions.subscribe).toHaveBeenCalledWith({ scope: 'region', key: 'Bicol Region' });
  });

  it('does not subscribe after notification denial and provides device settings', async () => {
    mockUser = { id: 'user-1' };
    const subscriptions = {
      get: jest.fn().mockResolvedValue({ scope: 'destination', key: 'cebu-city', subscribed: false }),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    } as unknown as SafetySubscriptionGateway;
    const notifications = {
      enable: jest.fn().mockResolvedValue({ safetyAlertsEnabled: false, festivalRemindersEnabled: false }),
    } as unknown as NotificationGateway;
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    await render(<SafetyAlertListScreen gateway={new FixtureSafetyAlertGateway()} notifications={notifications} subscriptions={subscriptions} />);

    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Cebu City' })); });
    const followDestination = await screen.findByRole('button', { name: 'Follow this place' });
    await act(async () => { fireEvent.press(followDestination); });

    expect(await screen.findByText(/Notifications are off/)).toBeTruthy();
    expect(subscriptions.subscribe).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: 'Open device settings' }));
    expect(openSettings).toHaveBeenCalledTimes(1);
  });

  it('follows only the resolved region after using current location', async () => {
    mockUser = { id: 'user-1' };
    const locationProvider: ForegroundLocationProvider = {
      requestForegroundPermission: jest.fn().mockResolvedValue('granted'),
      getCurrentCoordinates: jest.fn().mockResolvedValue({ latitude: 14.6, longitude: 121 }),
    };
    const subscriptions = {
      get: jest.fn().mockResolvedValue({ scope: 'region', key: 'National Capital Region', subscribed: false }),
      subscribe: jest.fn().mockResolvedValue({ scope: 'region', key: 'National Capital Region', subscribed: true }),
      unsubscribe: jest.fn(),
    } as unknown as SafetySubscriptionGateway;
    const notifications = {
      enable: jest.fn().mockResolvedValue({ safetyAlertsEnabled: true, festivalRemindersEnabled: false }),
    } as unknown as NotificationGateway;
    await render(<SafetyAlertListScreen
      gateway={new FixtureSafetyAlertGateway()}
      locationProvider={locationProvider}
      notifications={notifications}
      subscriptions={subscriptions}
    />);

    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Use my current location' })); });
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Continue with location' })); });
    const follow = await screen.findByRole('button', { name: 'Follow this place' });
    await act(async () => { fireEvent.press(follow); });

    expect(subscriptions.subscribe).toHaveBeenCalledWith({
      scope: 'region', key: 'National Capital Region',
    });
    expect(subscriptions.subscribe).not.toHaveBeenCalledWith(expect.objectContaining({
      latitude: expect.anything(), longitude: expect.anything(),
    }));
  });

  it('falls back to Events when the safety list has no navigation history', async () => {
    mockCanGoBack = false;
    await render(<SafetyAlertListScreen gateway={new FixtureSafetyAlertGateway()} />);
    fireEvent.press(screen.getByRole('button', { name: 'Back from safety alerts' }));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/events');
  });

  it('falls back to the safety list when alert details have no navigation history', async () => {
    mockCanGoBack = false;
    await render(<SafetyAlertDetailScreen gateway={new FixtureSafetyAlertGateway()} />);
    await screen.findByRole('header', { name: /Severe storm conditions/ });
    fireEvent.press(screen.getByRole('button', { name: 'Back to safety alerts' }));
    expect(mockReplace).toHaveBeenCalledWith('/alerts');
  });
});
