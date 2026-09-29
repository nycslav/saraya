import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StatusPanel } from '@/ui/components';
import { colors, spacing, type } from '@/ui/theme';

import { useAuth } from '../AuthProvider';
import { AuthShell, GoogleAuthButton } from '../components';

function messageFor(error: unknown) {
  if (error instanceof Error) {
    console.error('Authentication error:', error);
    return error.message;
  }

  console.error('Unknown authentication error:', error);
  return 'Sign-in could not be completed.';
}

export function LoginScreen() {
  const router = useRouter();
  const { loginWithGoogle } = useAuth();
  const [requestError, setRequestError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const submitGoogle = async () => {
    setLoading(true);
    setRequestError(undefined);
    try {
      const user = await loginWithGoogle();
      if (user) router.replace('/(tabs)/discover');
    } catch (error) {
      setRequestError(messageFor(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell onBack={() => router.back()}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>Continue with Google</Text>
        <Text style={styles.subtitle}>Sign in to save your Journey and Bucket List across devices.</Text>
      </View>

      {requestError ? <StatusPanel message={requestError} title="Could not sign in" tone="error" /> : null}
      <GoogleAuthButton loading={loading} onPress={() => void submitGoogle()} />
      <Text style={styles.note}>Google sign-in works in the Android development build, not Expo Go.</Text>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  heading: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  title: { color: colors.navy, fontFamily: type.black, fontSize: 30, textAlign: 'center' },
  subtitle: { color: colors.muted, fontFamily: type.medium, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  note: { color: colors.muted, fontFamily: type.medium, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
