import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { notificationGateway } from '../gateway';
import { NotificationPreferencesScreen } from '../screens/NotificationPreferencesScreen';

jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, restoring: false }),
}));
jest.mock('../gateway', () => ({ notificationGateway: { getPreferences: jest.fn(), updatePreferences: jest.fn(), enable: jest.fn() } }));

const mockGateway = notificationGateway as jest.Mocked<typeof notificationGateway>;

const disabled = { safetyAlertsEnabled: false, festivalRemindersEnabled: false };

describe('NotificationPreferencesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGateway.getPreferences.mockResolvedValue(disabled);
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
    expect(await screen.findByText('API unavailable')).toBeTruthy();
  });
});
