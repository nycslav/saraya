import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ProfileScreen } from '../screens/ProfileScreen';

const mockPush = jest.fn();
const mockStatistics = jest.fn();
const mockBucketList = jest.fn();

jest.mock('expo-router', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    useFocusEffect: (callback: () => void | (() => void)) => React.useEffect(callback, [callback]),
    useRouter: () => ({ push: mockPush, replace: jest.fn() }),
  };
});

jest.mock('@/features/journey/gateways', () => ({
  journeyGateway: { statistics: () => mockStatistics() },
}));

jest.mock('@/features/bucket-list/gateways', () => ({
  bucketListGateway: { list: () => mockBucketList() },
}));

jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({
    restoring: false,
    isDevelopmentPreview: false,
    user: {
      id: 'user-1',
      email: 'traveler@example.com',
      displayName: 'Traveler',
    },
    logout: jest.fn(),
  }),
}));

describe('profile connections', () => {
  it('shows current statistics and opens every available tool', async () => {
    mockStatistics.mockResolvedValue({
      totalVisits: 7,
      uniqueDestinations: 4,
      islandGroupsVisited: 2,
      achievementsUnlocked: 3,
    });
    mockBucketList.mockResolvedValue([{ id: 'saved-1' }, { id: 'saved-2' }]);

    await render(<ProfileScreen />);

    await waitFor(() => expect(screen.getByLabelText('4 places')).toBeTruthy());
    expect(screen.getByLabelText('2 saved')).toBeTruthy();
    expect(screen.getByLabelText('3 badges')).toBeTruthy();
    expect(screen.queryByText('Travel progress not connected')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Edit profile' }));
    await fireEvent.press(screen.getByRole('button', { name: 'My Journey, View' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Notifications, Manage' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Saraya Premium, View plans' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Privacy & Account, View details' }));

    expect(mockPush).toHaveBeenNthCalledWith(1, '/account/edit-profile');
    expect(mockPush).toHaveBeenNthCalledWith(2, '/(tabs)/journey');
    expect(mockPush).toHaveBeenNthCalledWith(3, '/notifications/preferences');
    expect(mockPush).toHaveBeenNthCalledWith(4, '/premium/paywall');
    expect(mockPush).toHaveBeenNthCalledWith(5, '/account/privacy');
  });
});
