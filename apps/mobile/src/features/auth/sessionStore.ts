import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const accessTokenKey = 'saraya.access-token';
const refreshTokenKey = 'saraya.refresh-token';

export const sessionStore = {
  async read() {
    if (Platform.OS === 'web') return null;
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(accessTokenKey),
      SecureStore.getItemAsync(refreshTokenKey),
    ]);
    return accessToken && refreshToken ? { accessToken, refreshToken } : null;
  },

  async write(accessToken: string, refreshToken: string) {
    if (Platform.OS === 'web') return;
    await Promise.all([
      SecureStore.setItemAsync(accessTokenKey, accessToken),
      SecureStore.setItemAsync(refreshTokenKey, refreshToken),
    ]);
  },

  async clear() {
    if (Platform.OS === 'web') return;
    await Promise.all([
      SecureStore.deleteItemAsync(accessTokenKey),
      SecureStore.deleteItemAsync(refreshTokenKey),
    ]);
  },
};
