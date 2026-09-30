import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { AuthSession, UserProfile } from '@saraya/contracts';
import { Pressable, Text } from 'react-native';

import {
  AuthProvider,
  isDevelopmentAuthBypassEnabled,
  useAuth,
} from '../AuthProvider';
import { authGateway } from '../gateway';
import { getGoogleIdToken } from '../googleSignIn';
import {
  identifyRevenueCatUser,
  resetRevenueCatUser,
} from '../../subscriptions/services/revenuecat';

jest.mock('../gateway', () => ({
  authGateway: {
    restore: jest.fn(),
    loginWithGoogle: jest.fn(),
    logout: jest.fn(),
    updateProfile: jest.fn(),
    uploadProfilePhoto: jest.fn(),
    reauthenticateAccount: jest.fn(),
    exportAccountData: jest.fn(),
    downloadAccountData: jest.fn(),
    deleteAccount: jest.fn(),
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
const googleIdToken = getGoogleIdToken as jest.MockedFunction<typeof getGoogleIdToken>;
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
      <Text>{auth.isDevelopmentPreview ? 'development-preview' : 'real-session'}</Text>
      <Text testID="profile-name">name:{auth.user?.displayName ?? 'no-name'}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="log in"
        onPress={() => void auth.loginWithGoogle()}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="save profile"
        onPress={() => void auth.saveProfile({ displayName: 'Maya Explorer' })}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="log out"
        onPress={() => void auth.logout()}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="delete account"
        onPress={() => void auth.deleteAccount()}
      />
    </>
  );
}

describe('AuthProvider RevenueCat identity lifecycle', () => {
  const originalBypass = process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS;

  beforeEach(() => {
    jest.clearAllMocks();
    gateway.restore.mockReset();
    gateway.loginWithGoogle.mockReset();
    gateway.logout.mockReset();
    gateway.updateProfile.mockReset();
    gateway.uploadProfilePhoto.mockReset();
    gateway.reauthenticateAccount.mockReset();
    gateway.exportAccountData.mockReset();
    gateway.downloadAccountData.mockReset();
    gateway.deleteAccount.mockReset();
    delete process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS;
    gateway.restore.mockResolvedValue(null);
    gateway.logout.mockResolvedValue();
    gateway.reauthenticateAccount.mockResolvedValue({
      accountActionToken: 'fresh-action-token',
      expiresAt: '2026-09-30T12:05:00.000Z',
    });
    gateway.deleteAccount.mockResolvedValue();
    googleIdToken.mockResolvedValue('google-id-token');
    identify.mockResolvedValue();
    reset.mockResolvedValue();
  });

  afterAll(() => {
    if (originalBypass === undefined) {
      delete process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS;
    } else {
      process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS = originalBypass;
    }
  });

  it('enables the bypass only for an explicitly configured development runtime', () => {
    expect(isDevelopmentAuthBypassEnabled(true, 'true')).toBe(true);
    expect(isDevelopmentAuthBypassEnabled(true, undefined)).toBe(false);
    expect(isDevelopmentAuthBypassEnabled(false, 'true')).toBe(false);
  });

  it('exposes a non-persistent preview user when development bypass is enabled', async () => {
    process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS = 'true';

    await render(<AuthProvider><Harness /></AuthProvider>);

    await waitFor(() => expect(screen.getByText('development-profile-preview')).toBeTruthy());
    expect(screen.getByText('development-preview')).toBeTruthy();
    expect(gateway.loginWithGoogle).not.toHaveBeenCalled();
    expect(identify).not.toHaveBeenCalled();
  });

  it('identifies the restored authenticated user before exposing the session', async () => {
    gateway.restore.mockResolvedValue(session('restored-user'));

    await render(<AuthProvider><Harness /></AuthProvider>);

    await waitFor(() => expect(screen.getByText('restored-user')).toBeTruthy());
    expect(screen.getByText('real-session')).toBeTruthy();
    expect(identify).toHaveBeenCalledWith('restored-user');
  });

  it('prefers a restored real session when development bypass is enabled', async () => {
    process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS = 'true';
    gateway.restore.mockResolvedValue(session('restored-user'));

    await render(<AuthProvider><Harness /></AuthProvider>);

    await waitFor(() => expect(screen.getByText('restored-user')).toBeTruthy());
    expect(screen.getByText('real-session')).toBeTruthy();
    expect(identify).toHaveBeenCalledWith('restored-user');
  });

  it('replaces the development preview with a real Google session', async () => {
    process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS = 'true';
    gateway.loginWithGoogle.mockResolvedValue(session('google-user'));

    await render(<AuthProvider><Harness /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('development-profile-preview')).toBeTruthy());

    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'log in' })); });

    await waitFor(() => expect(screen.getByText('google-user')).toBeTruthy());
    expect(screen.getByText('real-session')).toBeTruthy();
    expect(identify).toHaveBeenCalledWith('google-user');
  });

  it('exits preview without calling the authentication logout endpoint', async () => {
    process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS = 'true';

    await render(<AuthProvider><Harness /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('development-profile-preview')).toBeTruthy());

    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'log out' })); });

    await waitFor(() => expect(screen.getByText('signed-out')).toBeTruthy());
    expect(gateway.logout).not.toHaveBeenCalled();
    expect(identify).not.toHaveBeenCalled();
  });

  it('updates the development preview only in memory', async () => {
    process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS = 'true';
    await render(<AuthProvider><Harness /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('development-profile-preview')).toBeTruthy());

    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'save profile' })); });

    await waitFor(() => expect(screen.getByTestId('profile-name').props.children).toEqual(['name:', 'Maya Explorer']));
    expect(gateway.updateProfile).not.toHaveBeenCalled();
  });

  it('persists profile edits for a genuine session', async () => {
    gateway.restore.mockResolvedValue(session('user-one'));
    gateway.updateProfile.mockResolvedValue({ ...user('user-one'), displayName: 'Maya Explorer' });
    await render(<AuthProvider><Harness /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('user-one')).toBeTruthy());

    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'save profile' })); });

    expect(gateway.updateProfile).toHaveBeenCalledWith({ displayName: 'Maya Explorer' });
    await waitFor(() => expect(screen.getByTestId('profile-name').props.children).toEqual(['name:', 'Maya Explorer']));
  });

  it('switches RevenueCat identity whenever a different user signs in', async () => {
    gateway.loginWithGoogle
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
    gateway.loginWithGoogle.mockResolvedValue(session('user-one'));

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

  it('reauthenticates, deletes the server account, and clears the local identity', async () => {
    gateway.restore.mockResolvedValue(session('user-one'));
    await render(<AuthProvider><Harness /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('user-one')).toBeTruthy());
    reset.mockClear();

    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'delete account' })); });

    await waitFor(() => expect(screen.getByText('signed-out')).toBeTruthy());
    expect(gateway.reauthenticateAccount).toHaveBeenCalledWith('google-id-token');
    expect(gateway.deleteAccount).toHaveBeenCalledWith('fresh-action-token');
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('leaves the user signed out when the Google chooser is cancelled', async () => {
    googleIdToken.mockResolvedValue(null);

    await render(<AuthProvider><Harness /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('signed-out')).toBeTruthy());
    await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'log in' })); });

    expect(screen.getByText('signed-out')).toBeTruthy();
    expect(gateway.loginWithGoogle).not.toHaveBeenCalled();
  });
});
