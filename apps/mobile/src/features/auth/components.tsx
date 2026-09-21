import type { PropsWithChildren } from 'react';
import { ArrowLeft } from 'lucide-react-native';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Mascot } from '@/ui/components';
import { colors, radius, spacing, type } from '@/ui/theme';

export function AuthShell({ children, onBack }: PropsWithChildren<{ onBack?: () => void }>) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.fill}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {onBack ? (
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onBack}
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}
            >
              <ArrowLeft color={colors.navy} size={24} />
            </Pressable>
          ) : null}
          <View style={styles.mascotWrap}><Mascot size={92} /></View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function FormField({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error}
        autoCapitalize="none"
        placeholderTextColor={colors.muted}
        style={[styles.input, error && styles.inputError]}
        {...props}
      />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function GoogleAuthButton({
  loading,
  onPress,
}: {
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel="Continue with Google"
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: loading }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [styles.googleButton, pressed && styles.pressed, loading && styles.disabled]}
    >
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.googleMark}>
        <Text style={styles.googleLetter}>G</Text>
      </View>
      <Text style={styles.googleLabel}>{loading ? 'Connecting…' : 'Continue with Google'}</Text>
    </Pressable>
  );
}

export function OrDivider() {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.divider} />
      <Text style={styles.dividerLabel}>or</Text>
      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.lg },
  back: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  pressed: { opacity: 0.72 },
  mascotWrap: { alignItems: 'center', marginTop: spacing.sm },
  fieldGroup: { gap: spacing.sm },
  label: { color: colors.navy, fontFamily: type.bold, fontSize: 14 },
  input: { minHeight: 56, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.lg, color: colors.navy, fontFamily: type.medium, fontSize: 16 },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontFamily: type.medium, fontSize: 13, lineHeight: 18 },
  googleButton: { minHeight: 56, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  googleMark: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border },
  googleLetter: { color: '#4285F4', fontFamily: type.black, fontSize: 16 },
  googleLabel: { color: colors.navy, fontFamily: type.black, fontSize: 16 },
  disabled: { opacity: 0.5 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerLabel: { color: colors.muted, fontFamily: type.medium, fontSize: 14 },
});
