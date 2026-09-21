import { loginRequestSchema } from '@saraya/contracts';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { Button, StatusPanel } from '@/ui/components';
import { colors, spacing, type } from '@/ui/theme';

import { useAuth } from '../AuthProvider';
import { AuthShell, FormField, GoogleAuthButton, OrDivider } from '../components';

const emailSchema = z.string().trim().email('Enter a valid email address.');

function messageFor(error: unknown) {
  if (error instanceof Error && error.message.includes('development build')) return error.message;
  if (error instanceof Error && error.message.includes('EXPO_PUBLIC')) return error.message;
  return 'Sign-in is unavailable. Check that the Saraya API is running, then try again.';
}

export function LoginScreen() {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState<string>();
  const [requestError, setRequestError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const continueWithEmail = () => {
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setFieldError(result.error.issues[0]?.message);
      return;
    }
    setEmail(result.data);
    setFieldError(undefined);
    setStep('password');
  };

  const submit = async () => {
    const result = loginRequestSchema.safeParse({ email, password });
    if (!result.success) {
      setFieldError(result.error.issues[0]?.message);
      return;
    }
    setLoading(true);
    setFieldError(undefined);
    setRequestError(undefined);
    try {
      const user = await login(result.data);
      router.replace((user.onboardingComplete ? '/(tabs)/discover' : '/(auth)/onboarding') as Href);
    } catch (error) {
      setRequestError(messageFor(error));
    } finally {
      setLoading(false);
    }
  };

  const submitGoogle = async () => {
    setLoading(true);
    setRequestError(undefined);
    try {
      const user = await loginWithGoogle();
      if (user) router.replace((user.onboardingComplete ? '/(tabs)/discover' : '/(auth)/onboarding') as Href);
    } catch (error) {
      setRequestError(messageFor(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell onBack={step === 'password' ? () => { setStep('email'); setFieldError(undefined); } : () => router.back()}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>Log in or sign up</Text>
        <Text style={styles.subtitle}>Save your Philippine travel story across devices.</Text>
      </View>

      {requestError ? <StatusPanel message={requestError} title="Could not sign in" tone="error" /> : null}

      {step === 'email' ? (
        <>
          <FormField
            autoComplete="email"
            error={fieldError}
            keyboardType="email-address"
            label="Email address"
            onChangeText={(value) => { setEmail(value); setFieldError(undefined); }}
            onSubmitEditing={continueWithEmail}
            placeholder="you@example.com"
            returnKeyType="next"
            textContentType="emailAddress"
            value={email}
          />
          <Button label="Continue" onPress={continueWithEmail} />
        </>
      ) : (
        <>
          <Text style={styles.account}>{email}</Text>
          <FormField
            autoComplete="current-password"
            error={fieldError}
            label="Password"
            onChangeText={(value) => { setPassword(value); setFieldError(undefined); }}
            onSubmitEditing={() => void submit()}
            placeholder="At least 8 characters"
            returnKeyType="done"
            secureTextEntry
            textContentType="password"
            value={password}
          />
          <Button label="Log in" loading={loading} onPress={() => void submit()} />
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push(`/(auth)/register?email=${encodeURIComponent(email)}` as Href)}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text style={styles.link}>New to Saraya? Create an account</Text>
          </Pressable>
        </>
      )}

      <OrDivider />
      <GoogleAuthButton loading={loading} onPress={() => void submitGoogle()} />
      <Text style={styles.note}>Google sign-in works in the Android development build, not Expo Go.</Text>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  heading: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  title: { color: colors.navy, fontFamily: type.black, fontSize: 30, textAlign: 'center' },
  subtitle: { color: colors.muted, fontFamily: type.medium, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  account: { color: colors.blue, fontFamily: type.bold, fontSize: 15, textAlign: 'center' },
  link: { color: colors.blue, fontFamily: type.bold, fontSize: 15, textAlign: 'center', paddingVertical: spacing.md },
  note: { color: colors.muted, fontFamily: type.medium, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
