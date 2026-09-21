import { registerRequestSchema } from '@saraya/contracts';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, StatusPanel } from '@/ui/components';
import { colors, spacing, type } from '@/ui/theme';

import { useAuth } from '../AuthProvider';
import { AuthShell, FormField, GoogleAuthButton, OrDivider } from '../components';

export function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { register, loginWithGoogle } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const result = registerRequestSchema.safeParse({ displayName, email, password });
    if (!result.success) {
      setError(result.error.issues[0]?.message);
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      await register(result.data);
      router.replace('/(auth)/onboarding' as Href);
    } catch {
      setError('Account creation is unavailable. Check that the Saraya API is running.');
    } finally {
      setLoading(false);
    }
  };

  const submitGoogle = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const user = await loginWithGoogle();
      if (user) router.replace((user.onboardingComplete ? '/(tabs)/discover' : '/(auth)/onboarding') as Href);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Google sign-in is unavailable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell onBack={() => router.back()}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>A few details now, then choose your travel preferences.</Text>
      </View>
      {error ? <StatusPanel message={error} title="Could not create account" tone="error" /> : null}
      <FormField autoComplete="name" label="Name" onChangeText={setDisplayName} placeholder="Your name" textContentType="name" value={displayName} />
      <FormField autoComplete="email" keyboardType="email-address" label="Email address" onChangeText={setEmail} placeholder="you@example.com" textContentType="emailAddress" value={email} />
      <FormField autoComplete="new-password" label="Password" onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry textContentType="newPassword" value={password} />
      <Button label="Create account" loading={loading} onPress={() => void submit()} />
      <OrDivider />
      <GoogleAuthButton loading={loading} onPress={() => void submitGoogle()} />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  heading: { alignItems: 'center', gap: spacing.sm },
  title: { color: colors.navy, fontFamily: type.black, fontSize: 28, textAlign: 'center' },
  subtitle: { color: colors.muted, fontFamily: type.medium, fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
