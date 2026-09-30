import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PrivacyAccountScreen } from '../screens/PrivacyAccountScreen';

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockExportAccount = jest.fn();
const mockDeleteAccount = jest.fn();
let mockPreview = false;
let mockUser: { id: string; displayName: string; email: string } | null = {
  id: 'user-1',
  displayName: 'Traveler',
  email: 'traveler@example.com',
};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    canGoBack: () => true,
    push: mockPush,
    replace: mockReplace,
  }),
}));

jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({
    isDevelopmentPreview: mockPreview,
    user: mockUser,
    exportAccount: mockExportAccount,
    deleteAccount: mockDeleteAccount,
  }),
}));

describe('PrivacyAccountScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPreview = false;
    mockUser = {
      id: 'user-1',
      displayName: 'Traveler',
      email: 'traveler@example.com',
    };
  });

  it('shows the account and the privacy behavior supported by the app', async () => {
    await render(<PrivacyAccountScreen />);

    expect(screen.getByText('Connected with Google')).toBeTruthy();
    expect(screen.getByText('Connected Google email')).toBeTruthy();
    expect(screen.getByText('Location stays in your control')).toBeTruthy();
    expect(screen.getByText('Your data')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export my data' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete account' })).toBeTruthy();
  });

  it('identifies a preview email as unconnected', async () => {
    mockPreview = true;

    await render(<PrivacyAccountScreen />);

    expect(screen.getByText('Preview email (not connected)')).toBeTruthy();
    expect(screen.getByText('Development preview')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export my data' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete account' })).toBeDisabled();
  });

  it('shows the signed-out account state without an email label', async () => {
    mockUser = null;

    await render(<PrivacyAccountScreen />);

    expect(screen.getByText('Guest account')).toBeTruthy();
    expect(screen.queryByText('Connected Google email')).toBeNull();
  });

  it('opens notification settings', async () => {
    await render(<PrivacyAccountScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Notifications, manage' }));
    expect(mockPush).toHaveBeenCalledWith('/notifications/preferences');
  });

  it('opens the existing profile editor', async () => {
    await render(<PrivacyAccountScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Edit profile' }));
    expect(mockPush).toHaveBeenCalledWith('/account/edit-profile');
  });

  it('opens the app permissions overview', async () => {
    await render(<PrivacyAccountScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'App permissions, view details' }));

    expect(mockPush).toHaveBeenCalledWith('/account/permissions');
  });

  it('exports account data after reauthentication', async () => {
    mockExportAccount.mockResolvedValue(undefined);
    await render(<PrivacyAccountScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Export my data' }));

    expect(mockExportAccount).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Your export is ready')).toBeTruthy();
  });

  it('requires DELETE before permanently deleting the account', async () => {
    mockDeleteAccount.mockResolvedValue(undefined);
    await render(<PrivacyAccountScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Delete account' }));
    expect(screen.getByRole('button', { name: 'Permanently delete account' })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Type DELETE to confirm'), 'DELETE');
    await screen.findByDisplayValue('DELETE');
    await fireEvent.press(screen.getByRole('button', { name: 'Permanently delete account' }));

    await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalledTimes(1));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/discover');
  });
});
