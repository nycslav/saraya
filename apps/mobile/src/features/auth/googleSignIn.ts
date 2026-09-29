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

  console.log('[GoogleSignIn] Loading native module');

  const {
    GoogleOneTapSignIn,
    isCancelledResponse,
    isNoSavedCredentialFoundResponse,
    isSuccessResponse,
  } = await import('react-native-nitro-google-signin');

  console.log('[GoogleSignIn] Configuring');

  GoogleOneTapSignIn.configure({
    webClientId: getGoogleWebClientId(),
    autoSelectOnSignIn: false,
  });

  console.log('[GoogleSignIn] Checking Play Services');
  await GoogleOneTapSignIn.checkPlayServices(true);

  console.log('[GoogleSignIn] Starting sign-in');
  let response = await GoogleOneTapSignIn.signIn();

  console.log('[GoogleSignIn] Sign-in response type received');

  if (isNoSavedCredentialFoundResponse(response)) {
    console.log('[GoogleSignIn] No saved credential; creating account');
    response = await GoogleOneTapSignIn.createAccount();
  }

  if (isCancelledResponse(response)) {
    console.log('[GoogleSignIn] Cancelled');
    return null;
  }

  if (!isSuccessResponse(response)) {
    console.error('[GoogleSignIn] Unsuccessful response:', response);
    throw new GoogleSignInUnavailableError(
      'Google sign-in could not be completed.',
    );
  }

  console.log(
    '[GoogleSignIn] Success; ID token present:',
    Boolean(response.data.idToken),
  );

  return response.data.idToken;
}

export async function signOutFromGoogle() {
  if (Constants.appOwnership === AppOwnership.Expo) return;
  const { GoogleOneTapSignIn } = await import('react-native-nitro-google-signin');
  await GoogleOneTapSignIn.signOut();
}
