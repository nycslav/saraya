import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { AuthSession, UserProfile } from '@saraya/contracts';
import { Pressable, Text } from 'react-native';

import { AuthProvider, useAuth } from '../AuthProvider';
import { authGateway } from '../gateway';
import {
  identifyRevenueCatUser,
  resetRevenueCatUser,
} from '../../subscriptions/services/revenuecat';

jest.mock('../gateway', () => ({
  authGateway: {
    restore: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
    loginWithGoogle: jest.fn(),
    updateProfile: jest.fn(),
    logout: jest.fn(),
  },
}));

jest.mock('../googleSignIn', () => ({
  getGoogleIdToken: jest.fn(),
  signOutFromGoogle: jest.fn(),
}));

jest.mock('../../subscriptions/services/revenuecat', () => ({
  identifyRevenueCatUser: jest.fn(),
  resetRevenueCatUser: jest.fn(),
}));

const gateway = authGateway as jest.Mocked<typeof authGateway>;
const identify = identifyRevenueCatUser as jest.MockedFunction<typeof identifyRevenueCatUser>;
const reset = resetRevenueCatUser as jest.MockedFunction<typeof resetRevenueCatUser>;

function user(id: string): UserProfile {
  return {
    id,
    email: `${id}@example.com`,
    displayName: id,
    avatarUrl: null,
    homeRegion: null,
    travelStyle: null,
    budget: null,
    interests: [],
    preferredRegions: [],
    onboardingComplete: true,
  };
}

function session(id: string): AuthSession {
  return {
    accessToken: `access-${id}`,
    refreshToken: `refresh-${id}`,
    user: user(id),
  };
}

function Harness() {
  const auth = useAuth();
  return (
    <>
      <Text>{auth.restoring ? 'restoring' : (auth.user?.id ?? 'signed-out')}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="log in"
        onPress={() => void auth.login({ email: 'member@example.com', password: 'password' })}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="log out"
        onPress={() => void auth.logout()}
      />
    </>
  );
}

describe('AuthProvider RevenueCat identity lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    gateway.restore.mockResolvedValue(null);
    gateway.logout.mockResolvedValue();
    identify.mockResolvedValue();
    reset.mockResolvedValue();
  });

  it('identifies the restored authenticated user before exposing the session', async () => {
    gateway.restore.mockResolvedValue(session('restored-user'));

    await render(<AuthProvider><Harness /></AuthProvider>);

    await waitFor(() => expect(screen.getByText('restored-user')).toBeTruthy());
    expect(identify).toHaveBeenCalledWith('restored-user');
  });

  it('switches RevenueCat identity whenever a different user signs in', async () => {
    gateway.login
      .mockResolvedValueOnce(session('user-one'))
      .mockResolvedValueOnce(session('user-two'));

    await render(<AuthProvider><Harness /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('signed-out')).toBeTruthy());

    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'log in' })); });
    await waitFor(() => expect(screen.getByText('user-one')).toBeTruthy());
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'log in' })); });
    await waitFor(() => expect(screen.getByText('user-two')).toBeTruthy());

    expect(identify.mock.calls).toEqual([['user-one'], ['user-two']]);
  });

  it('resets RevenueCat customer state on logout', async () => {
    gateway.login.mockResolvedValue(session('user-one'));

    await render(<AuthProvider><Harness /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('signed-out')).toBeTruthy());
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'log in' })); });
    await waitFor(() => expect(screen.getByText('user-one')).toBeTruthy());
    reset.mockClear();

    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'log out' })); });

    await waitFor(() => expect(screen.getByText('signed-out')).toBeTruthy());
    expect(reset).toHaveBeenCalledTimes(1);
    expect(gateway.logout).toHaveBeenCalledTimes(1);
  });
});
