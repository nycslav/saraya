import { addPushTokenListener, getExpoPushToken, requestNotificationPermission } from '../expo-notifications';

const mockGetPermissions = jest.fn();
const mockRequestPermissions = jest.fn();
const mockGetToken = jest.fn();
const mockSetChannel = jest.fn();
const mockAddPushTokenListener = jest.fn();

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { easConfig: { projectId: 'project-1' }, expoConfig: undefined },
}));
jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 4 },
  getPermissionsAsync: (...args: unknown[]) => mockGetPermissions(...args),
  requestPermissionsAsync: (...args: unknown[]) => mockRequestPermissions(...args),
  getExpoPushTokenAsync: (...args: unknown[]) => mockGetToken(...args),
  setNotificationChannelAsync: (...args: unknown[]) => mockSetChannel(...args),
  setNotificationHandler: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addPushTokenListener: (...args: unknown[]) => mockAddPushTokenListener(...args),
  getLastNotificationResponseAsync: jest.fn(),
  clearLastNotificationResponseAsync: jest.fn(),
}));

describe('Expo notification boundary', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not prompt when permission is already granted', async () => {
    mockGetPermissions.mockResolvedValue({ granted: true, canAskAgain: true });
    await expect(requestNotificationPermission()).resolves.toBe(true);
    expect(mockRequestPermissions).not.toHaveBeenCalled();
  });

  it('handles granted and denied permission requests', async () => {
    mockGetPermissions.mockResolvedValue({ granted: false, canAskAgain: true });
    mockRequestPermissions.mockResolvedValueOnce({ granted: true }).mockResolvedValueOnce({ granted: false });
    await expect(requestNotificationPermission()).resolves.toBe(true);
    await expect(requestNotificationPermission()).resolves.toBe(false);
  });

  it('retrieves a project-scoped token and normalizes acquisition failures', async () => {
    mockGetToken.mockResolvedValue({ data: 'ExpoPushToken[token]' });
    await expect(getExpoPushToken()).resolves.toBe('ExpoPushToken[token]');
    expect(mockGetToken).toHaveBeenCalledWith({ projectId: 'project-1' });
    mockGetToken.mockRejectedValue(new Error('offline'));
    await expect(getExpoPushToken()).rejects.toThrow('could not obtain');
  });

  it('re-resolves an Expo token after the native token changes', async () => {
    let nativeListener: (() => void) | undefined;
    mockAddPushTokenListener.mockImplementation((listener) => {
      nativeListener = listener;
      return { remove: jest.fn() };
    });
    mockGetToken.mockResolvedValue({ data: 'ExpoPushToken[refreshed]' });
    const listener = jest.fn();
    addPushTokenListener(listener);
    nativeListener?.();
    await Promise.resolve();
    await Promise.resolve();
    expect(listener).toHaveBeenCalledWith('ExpoPushToken[refreshed]');
  });
});
