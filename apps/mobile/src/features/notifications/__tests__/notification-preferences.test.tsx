import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { notificationGateway } from '../gateway';
import { NotificationPreferencesScreen } from '../screens/NotificationPreferencesScreen';

const mockBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockReplace = jest.fn();
type MockAuthState = { user: { id: string } | null; restoring: boolean };
const mockUseAuth = jest.fn<MockAuthState, []>(() => ({
  user: { id: 'user-1' },
  restoring: false,
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, canGoBack: mockCanGoBack, replace: mockReplace }),
}));
jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));
jest.mock('../gateway', () => ({ notificationGateway: { getPreferences: jest.fn(), updatePreferences: jest.fn(), enable: jest.fn() } }));

const mockGateway = notificationGateway as jest.Mocked<typeof notificationGateway>;

const disabled = { safetyAlertsEnabled: false, festivalRemindersEnabled: false };

describe('NotificationPreferencesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack.mockReturnValue(true);
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' }, restoring: false });
    mockGateway.getPreferences.mockResolvedValue(disabled);
  });

  it('returns to the previous screen from loaded preferences', async () => {
    await render(<NotificationPreferencesScreen />);
    expect(await screen.findByLabelText('Safety alerts')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Back to profile' }));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('falls back to Profile when there is no navigation history', async () => {
    mockCanGoBack.mockReturnValue(false);
    await render(<NotificationPreferencesScreen />);
    expect(await screen.findByLabelText('Safety alerts')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Back to profile' }));

    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/profile');
    expect(mockBack).not.toHaveBeenCalled();
  });

  it.each([
    ['loading', { user: null, restoring: true }, 'Loading notification preferences…'],
    ['signed out', { user: null, restoring: false }, 'Sign in required'],
  ] as const)('keeps the back button available while %s', async (_state, auth, copy) => {
    mockUseAuth.mockReturnValue(auth);

    await render(<NotificationPreferencesScreen />);

    expect(screen.getByText(copy)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back to profile' })).toBeTruthy();
  });

  it('keeps the back button available when preferences fail to load', async () => {
    mockGateway.getPreferences.mockRejectedValue(new Error('API unavailable'));

    await render(<NotificationPreferencesScreen />);

    expect(await screen.findByText('Notification preferences could not be loaded.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back to profile' })).toBeTruthy();
  });

  it('loads preferences and enables a category contextually', async () => {
    mockGateway.enable.mockResolvedValue({ ...disabled, safetyAlertsEnabled: true });
    await render(<NotificationPreferencesScreen />);
    expect(await screen.findByLabelText('Safety alerts')).toBeTruthy();
    await act(async () => {
      fireEvent(screen.getByLabelText('Safety alerts'), 'valueChange', true);
      await Promise.resolve();
    });
    expect(mockGateway.enable).toHaveBeenCalledWith({ safetyAlertsEnabled: true });
  });

  it('keeps the UI usable when permission is denied', async () => {
    mockGateway.enable.mockResolvedValue(disabled);
    await render(<NotificationPreferencesScreen />);
    expect(await screen.findByLabelText('Safety alerts')).toBeTruthy();
    await act(async () => {
      fireEvent(screen.getByLabelText('Safety alerts'), 'valueChange', true);
      await Promise.resolve();
    });
    expect(await screen.findByText(/Permission was not granted/)).toBeTruthy();
    expect(screen.getByLabelText('Festival reminders')).toBeTruthy();
  });

  it('restores the previous value after an API failure', async () => {
    mockGateway.updatePreferences.mockRejectedValue(new Error('API unavailable'));
    await render(<NotificationPreferencesScreen />);
    expect(await screen.findByLabelText('Festival reminders')).toBeTruthy();
    await act(async () => {
      fireEvent(screen.getByLabelText('Festival reminders'), 'valueChange', false);
      await Promise.resolve();
    });
    expect(await screen.findByText('Your notification choice could not be saved. Check your internet connection and try again.')).toBeTruthy();
  });
});
