import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ProfileScreen } from '@/features/profile/screens/ProfileScreen';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockLogout = jest.fn();
let mockDevelopmentPreview = false;
const mockUser = {
  id: 'user-1',
  email: 'traveler@example.com',
  displayName: 'Traveler',
  avatarUrl: null,
  homeRegion: null,
  travelStyle: null,
  budget: null,
  interests: [],
  preferredRegions: [],
  onboardingComplete: true,
};

jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

jest.mock('../AuthProvider', () => ({
  useAuth: () => ({
    restoring: false,
    isDevelopmentPreview: mockDevelopmentPreview,
    user: mockUser,
    logout: mockLogout,
  }),
}));

describe('profile logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDevelopmentPreview = false;
    mockLogout.mockResolvedValue(undefined);
  });

  it('labels a local mock identity as a development preview', async () => {
    mockDevelopmentPreview = true;

    await render(<ProfileScreen />);

    expect(screen.getByText('Development preview')).toBeTruthy();
    expect(screen.queryByText('Google account')).toBeNull();
  });

  it('clears the session before returning to Discover as a guest', async () => {
    await render(<ProfileScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Log out' }));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)/discover');
    });
  });
});
