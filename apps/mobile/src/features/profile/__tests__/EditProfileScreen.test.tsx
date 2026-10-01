import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { EditProfileScreen } from '../screens/EditProfileScreen';

const mockBack = jest.fn();
const mockSaveProfile = jest.fn();
const mockRequestPermission = jest.fn();
const mockLaunchLibrary = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ canGoBack: () => true, back: mockBack, replace: jest.fn() }),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: () => mockRequestPermission(),
  launchImageLibraryAsync: (options: unknown) => mockLaunchLibrary(options),
}));

jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({
    isDevelopmentPreview: false,
    saveProfile: mockSaveProfile,
    user: {
      id: 'user-1',
      email: 'traveler@example.com',
      displayName: 'Traveler',
      avatarUrl: null,
    },
  }),
}));

describe('EditProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestPermission.mockResolvedValue({ granted: true });
    mockLaunchLibrary.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///profile.jpg', mimeType: 'image/jpeg', fileName: 'profile.jpg' }],
    });
    mockSaveProfile.mockResolvedValue(undefined);
  });

  it('chooses a cropped photo and saves the updated display name', async () => {
    await render(<EditProfileScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Choose profile picture' }));
    await waitFor(() => expect(mockLaunchLibrary).toHaveBeenCalledWith(expect.objectContaining({
      allowsEditing: true,
      aspect: [1, 1],
    })));
    await screen.findByText('Choose a different photo');
    await fireEvent.changeText(screen.getByDisplayValue('Traveler'), 'Maya Explorer');
    expect(screen.getByDisplayValue('Maya Explorer')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Save profile' }));

    await waitFor(() => expect(mockSaveProfile).toHaveBeenCalledWith({
      displayName: 'Maya Explorer',
      photo: { uri: 'file:///profile.jpg', mimeType: 'image/jpeg', fileName: 'profile.jpg' },
    }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('explains when photo-library permission is unavailable', async () => {
    mockRequestPermission.mockResolvedValue({ granted: false });
    await render(<EditProfileScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Choose profile picture' }));

    expect(await screen.findByText('Allow photo library access to choose a profile picture.')).toBeTruthy();
    expect(mockLaunchLibrary).not.toHaveBeenCalled();
  });
});
