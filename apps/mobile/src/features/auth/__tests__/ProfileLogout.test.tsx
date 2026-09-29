import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { ProfileScreen } from '@/features/profile/screens/ProfileScreen';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockLogout = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

jest.mock('../AuthProvider', () => ({
  useAuth: () => ({
    restoring: false,
    user: {
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
    },
    logout: mockLogout,
  }),
}));

describe('profile logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogout.mockResolvedValue(undefined);
  });

  it('clears the session before returning to Discover as a guest', async () => {
    await render(<ProfileScreen />);

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Log out' }));
    });

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/discover');
  });
});
