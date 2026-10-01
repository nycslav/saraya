import { act, render } from '@testing-library/react-native';
import { NotificationObserver } from '../NotificationObserver';

const mockPush = jest.fn();
const mockRemoveResponse = jest.fn();
const mockRemoveToken = jest.fn();
let mockResponseListener: ((data: unknown) => void) | undefined;
const mockGetInitial = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/features/notifications/gateway', () => ({ notificationGateway: {
  registerCurrentToken: jest.fn(), getPreferences: jest.fn(), updatePreferences: jest.fn(), enable: jest.fn(),
} }));
jest.mock('../expo-notifications', () => ({
  configureForegroundNotificationBehavior: jest.fn(),
  getInitialNotificationData: (...args: unknown[]) => mockGetInitial(...args),
  addNotificationResponseListener: (listener: (data: unknown) => void) => { mockResponseListener = listener; return { remove: mockRemoveResponse }; },
  addPushTokenListener: () => ({ remove: mockRemoveToken }),
}));

describe('NotificationObserver', () => {
  beforeEach(() => { jest.clearAllMocks(); mockResponseListener = undefined; mockGetInitial.mockResolvedValue(undefined); });

  it('routes cold-start and foreground/background taps and cleans listeners', async () => {
    mockGetInitial.mockResolvedValue({ type: 'safety_alert', alertId: 'cold' });
    const view = await render(<NotificationObserver />);
    await act(async () => { await Promise.resolve(); });
    expect(mockPush).toHaveBeenCalledWith('/alerts/cold');
    await act(async () => { mockResponseListener?.({ type: 'festival_reminder', festivalId: 'sinulog' }); });
    expect(mockPush).toHaveBeenCalledWith('/festivals/sinulog');
    await act(async () => { mockResponseListener?.({ type: 'unknown', url: '/anything' }); });
    expect(mockPush).toHaveBeenCalledTimes(2);
    await act(async () => { await view.unmount(); });
    expect(mockRemoveResponse).toHaveBeenCalledTimes(1);
    expect(mockRemoveToken).toHaveBeenCalledTimes(1);
  });
});
