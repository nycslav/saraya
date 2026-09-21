export class MobileConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MobileConfigurationError';
  }
}

export function getApiBaseUrl() {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (!baseUrl) {
    throw new MobileConfigurationError(
      'EXPO_PUBLIC_API_BASE_URL is required to connect Saraya to its API.',
    );
  }
  return baseUrl;
}

export function getGoogleWebClientId() {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  if (!clientId) {
    throw new MobileConfigurationError(
      'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is required for Google sign-in.',
    );
  }
  return clientId;
}
