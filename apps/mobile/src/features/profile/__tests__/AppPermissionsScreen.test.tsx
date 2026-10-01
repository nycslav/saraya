import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { AppPermissionsScreen } from '../screens/AppPermissionsScreen';

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockLocationStatus = jest.fn();
const mockNotificationStatus = jest.fn();
const mockPhotoStatus = jest.fn();
const mockCameraStatus = jest.fn();
const mockCalendarStatus = jest.fn();

jest.mock('expo-router', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    useFocusEffect: (callback: () => void | (() => void)) => React.useEffect(callback, [callback]),
    useRouter: () => ({ back: mockBack, canGoBack: () => true, replace: mockReplace }),
  };
});

jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: () => mockLocationStatus(),
  requestForegroundPermissionsAsync: jest.fn(),
}));
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: () => mockNotificationStatus(),
  requestPermissionsAsync: jest.fn(),
}));
jest.mock('expo-image-picker', () => ({
  getMediaLibraryPermissionsAsync: () => mockPhotoStatus(),
  getCameraPermissionsAsync: () => mockCameraStatus(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
}));
jest.mock('expo-calendar', () => ({
  getCalendarPermissions: () => mockCalendarStatus(),
  requestCalendarPermissions: jest.fn(),
}));

describe('AppPermissionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocationStatus.mockResolvedValue({ status: 'granted', granted: true });
    mockNotificationStatus.mockResolvedValue({ status: 'denied', granted: false });
    mockPhotoStatus.mockResolvedValue({ status: 'undetermined', granted: false });
    mockCameraStatus.mockResolvedValue({ status: 'denied', granted: false });
    mockCalendarStatus.mockResolvedValue({ status: 'granted', granted: true });
  });

  it('reports every optional permission without requesting any of them', async () => {
    await render(<AppPermissionsScreen />);

    await waitFor(() => expect(screen.getByLabelText(/Location\. Allowed\./)).toBeTruthy());
    expect(screen.getByLabelText(/Notifications\. Not allowed\./)).toBeTruthy();
    expect(screen.getByLabelText(/Photos\. Not requested\./)).toBeTruthy();
    expect(screen.getByLabelText(/Camera\. Not allowed\./)).toBeTruthy();
    expect(screen.getByLabelText(/Calendar\. Allowed\./)).toBeTruthy();

    const Location = jest.requireMock('expo-location');
    const Notifications = jest.requireMock('expo-notifications');
    const ImagePicker = jest.requireMock('expo-image-picker');
    const Calendar = jest.requireMock('expo-calendar');
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(ImagePicker.requestMediaLibraryPermissionsAsync).not.toHaveBeenCalled();
    expect(ImagePicker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
    expect(Calendar.requestCalendarPermissions).not.toHaveBeenCalled();
  });

  it('opens device settings only after the user asks', async () => {
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    await render(<AppPermissionsScreen />);

    expect(openSettings).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: 'Open device settings' }));
    await waitFor(() => expect(openSettings).toHaveBeenCalledTimes(1));
  });
});
