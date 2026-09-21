import Constants, { AppOwnership } from 'expo-constants';

import { getGoogleWebClientId } from '@/core/config';

export class GoogleSignInUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoogleSignInUnavailableError';
  }
}

export async function getGoogleIdToken() {
  if (Constants.appOwnership === AppOwnership.Expo) {
    throw new GoogleSignInUnavailableError(
      'Google sign-in needs the Saraya Android development build and is not available in Expo Go.',
    );
  }

  const {
    GoogleOneTapSignIn,
    isCancelledResponse,
    isNoSavedCredentialFoundResponse,
    isSuccessResponse,
  } = await import('react-native-nitro-google-signin');

  GoogleOneTapSignIn.configure({
    webClientId: getGoogleWebClientId(),
    autoSelectOnSignIn: false,
  });
  await GoogleOneTapSignIn.checkPlayServices(true);

  let response = await GoogleOneTapSignIn.signIn();
  if (isNoSavedCredentialFoundResponse(response)) {
    response = await GoogleOneTapSignIn.createAccount();
  }
  if (isCancelledResponse(response)) return null;
  if (!isSuccessResponse(response)) {
    throw new GoogleSignInUnavailableError('Google sign-in could not be completed.');
  }
  return response.data.idToken;
}

export async function signOutFromGoogle() {
  if (Constants.appOwnership === AppOwnership.Expo) return;
  const { GoogleOneTapSignIn } = await import('react-native-nitro-google-signin');
  await GoogleOneTapSignIn.signOut();
}
