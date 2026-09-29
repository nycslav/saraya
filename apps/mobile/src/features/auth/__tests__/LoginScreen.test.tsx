import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { LoginScreen } from '../screens/LoginScreen';

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockLoginWithGoogle = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
}));

jest.mock('../AuthProvider', () => ({
  useAuth: () => ({ loginWithGoogle: mockLoginWithGoogle }),
}));

describe('Google-only login screen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows Google login without email or password registration controls', async () => {
    await render(<LoginScreen />);

    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeTruthy();
    expect(screen.queryByText('Email address')).toBeNull();
    expect(screen.queryByText('Create an account')).toBeNull();
  });

  it('opens Discover after a successful Google login', async () => {
    mockLoginWithGoogle.mockResolvedValue({ id: 'user-1' });
    await render(<LoginScreen />);

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));
    });

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)/discover'));
  });

  it('stays on login without an error when the Google chooser is cancelled', async () => {
    mockLoginWithGoogle.mockResolvedValue(null);
    await render(<LoginScreen />);

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));
    });

    await waitFor(() => expect(mockLoginWithGoogle).toHaveBeenCalledTimes(1));
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.queryByText('Could not sign in')).toBeNull();
  });
});
