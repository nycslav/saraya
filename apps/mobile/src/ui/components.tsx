import type { PropsWithChildren, ReactNode } from 'react';
import { forwardRef, useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import type { LucideIcon } from 'lucide-react-native';
import { Search, Sparkles } from 'lucide-react-native';
import {
  ActivityIndicator,
  AccessibilityInfo,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type ScrollViewProps,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, shadows, spacing, type } from './theme';

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => subscription.remove();
  }, []);

  return reducedMotion;
}

export function Screen({
  children,
  scroll = true,
  contentContainerStyle,
  ...scrollProps
}: PropsWithChildren<ScrollViewProps & { scroll?: boolean; contentContainerStyle?: ViewStyle }>) {
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.screenContent, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...scrollProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.screenContent, styles.fill, contentContainerStyle]}>{children}</View>
  );

  return <SafeAreaView style={styles.safeArea}>{content}</SafeAreaView>;
}

type ButtonProps = PressableProps & {
  label: string;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary' | 'quiet';
  loading?: boolean;
};

export function Button({
  label,
  icon: Icon,
  variant = 'primary',
  loading = false,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const reducedMotion = useReducedMotion();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={(state) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'quiet' && styles.buttonQuiet,
        state.pressed && (reducedMotion ? styles.pressedReducedMotion : styles.pressed),
        isDisabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.navy : colors.blue} />
      ) : (
        <>
          {Icon ? <Icon color={colors.navy} size={20} strokeWidth={2.2} /> : null}
          <Text style={styles.buttonLabel}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  selected = false,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && onPress ? (reducedMotion ? styles.pressedReducedMotion : styles.pressed) : null,
      ]}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      {action}
    </View>
  );
}

export const SearchField = forwardRef<TextInput, TextInputProps>(function SearchField(props, ref) {
  return (
    <View style={styles.searchWrap}>
      <Search color={colors.muted} size={20} />
      <TextInput
        ref={ref}
        accessibilityLabel="Search destinations"
        placeholderTextColor={colors.muted}
        returnKeyType="search"
        style={styles.searchInput}
        {...props}
      />
    </View>
  );
});

const gradientMap = {
  sky: ['#DDF5FD', '#0BA6DF'], sunset: ['#FFF0D1', '#EF7722'],
  forest: ['#DDF4EA', '#18825C'], lagoon: ['#DDF5FD', '#00A6A6'],
  violet: ['#ECE6FA', '#7756B3'], gold: ['#FFF0D1', '#FAA533'],
} as const;

export function DestinationArtwork({
  tone,
  label,
  imageUrl,
  compact = false,
}: {
  tone: keyof typeof gradientMap;
  label: string;
  imageUrl?: string;
  compact?: boolean;
}) {
  const [failedImageUrl, setFailedImageUrl] = useState<string>();

  if (imageUrl && failedImageUrl !== imageUrl) {
    return (
      <Image
        accessibilityLabel={`${label} destination photograph`}
        onError={() => setFailedImageUrl(imageUrl)}
        resizeMode="cover"
        source={{ uri: imageUrl }}
        style={[styles.artwork, compact && styles.artworkCompact]}
      />
    );
  }

  return (
    <LinearGradient
      accessibilityLabel={`${label} illustrated destination artwork`}
      colors={gradientMap[tone]}
      style={[styles.artwork, compact && styles.artworkCompact]}
    >
      <View style={styles.sun} />
      <View style={[styles.mountain, styles.mountainBack]} />
      <View style={[styles.mountain, styles.mountainFront]} />
    </LinearGradient>
  );
}

const mascotSources = {
  wave: require('../../assets/images/saraya-wave.png'),
  laugh: require('../../assets/images/saraya-laugh.png'),
  star: require('../../assets/images/saraya-star-eyed.png'),
};

export function Mascot({ mood = 'wave', size = 104 }: { mood?: keyof typeof mascotSources; size?: number }) {
  return (
    <Image
      accessibilityLabel={`Saraya mascot, ${mood} expression`}
      resizeMode="contain"
      source={mascotSources[mood]}
      style={{ width: size, height: size }}
    />
  );
}

export function StatusPanel({
  title,
  message,
  tone = 'info',
  action,
}: {
  title: string;
  message: string;
  tone?: 'info' | 'success' | 'warning' | 'error';
  action?: ReactNode;
}) {
  const toneStyle = {
    info: styles.statusInfo,
    success: styles.statusSuccess,
    warning: styles.statusWarning,
    error: styles.statusError,
  }[tone];
  return (
    <View accessibilityRole="alert" style={[styles.status, toneStyle]}>
      <Sparkles color={colors.navy} size={22} />
      <View style={styles.statusText}>
        <Text style={styles.statusTitle}>{title}</Text>
        <Text style={styles.statusMessage}>{message}</Text>
        {action}
      </View>
    </View>
  );
}

export function LoadingState({ label }: { label: string }) {
  const reducedMotion = useReducedMotion();
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} style={styles.centerState}>
      {reducedMotion ? <Sparkles color={colors.blue} size={32} /> : <ActivityIndicator color={colors.blue} size="large" />}
      <Text style={styles.stateText}>{label}</Text>
    </View>
  );
}

export function ComingSoonScreen({ title, owner }: { title: string; owner: string }) {
  return (
    <Screen contentContainerStyle={styles.comingSoon}>
      <Mascot mood="wave" size={142} />
      <Text accessibilityRole="header" style={styles.comingTitle}>{title}</Text>
      <Text style={styles.comingBody}>
        This navigation slot is ready. {owner} owns the feature implementation that will connect here.
      </Text>
      <StatusPanel
        message="The shell is intentionally lightweight so teammates can replace it without undoing shared navigation work."
        title="Team boundary preserved"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, fill: { flex: 1 },
  screenContent: { padding: spacing.xl, paddingBottom: 120, gap: spacing.lg },
  button: { minHeight: 52, borderRadius: radius.md, paddingHorizontal: spacing.xl, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm },
  buttonPrimary: { backgroundColor: colors.coral },
  buttonSecondary: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  buttonQuiet: { backgroundColor: colors.blueSoft },
  buttonLabel: { color: colors.navy, fontFamily: type.black, fontSize: 15 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.99 }] }, disabled: { opacity: 0.48 },
  pressedReducedMotion: { opacity: 0.76 },
  chip: { minHeight: 44, paddingHorizontal: spacing.lg, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  chipSelected: { backgroundColor: colors.blueSoft, borderColor: colors.blue },
  chipLabel: { fontFamily: type.bold, color: colors.muted, fontSize: 14 }, chipLabelSelected: { color: colors.navy },
  card: { borderRadius: radius.lg, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadows.card },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontFamily: type.black, color: colors.navy, fontSize: 20 },
  searchWrap: { minHeight: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  searchInput: { flex: 1, fontFamily: type.medium, color: colors.navy, fontSize: 16, paddingVertical: 0 },
  artwork: { height: 176, overflow: 'hidden', position: 'relative' }, artworkCompact: { width: 92, height: 92, borderRadius: radius.md },
  sun: { position: 'absolute', right: 24, top: 22, width: 42, height: 42, borderRadius: 21, backgroundColor: colors.yellow },
  mountain: { position: 'absolute', width: 170, height: 170, transform: [{ rotate: '45deg' }], borderRadius: 24 },
  mountainBack: { left: -20, bottom: -112, backgroundColor: '#2E9E78' }, mountainFront: { right: -28, bottom: -126, backgroundColor: '#176D72' },
  status: { borderRadius: radius.md, padding: spacing.lg, flexDirection: 'row', gap: spacing.md },
  statusInfo: { backgroundColor: colors.blueSoft }, statusSuccess: { backgroundColor: colors.greenSoft },
  statusWarning: { backgroundColor: colors.yellowSoft }, statusError: { backgroundColor: colors.dangerSoft },
  statusText: { flex: 1, gap: 2 }, statusTitle: { color: colors.navy, fontFamily: type.black, fontSize: 14 },
  statusMessage: { color: colors.muted, fontFamily: type.medium, fontSize: 13, lineHeight: 19 },
  centerState: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  stateText: { color: colors.muted, fontFamily: type.bold, fontSize: 15, textAlign: 'center' },
  comingSoon: { alignItems: 'center', justifyContent: 'center', minHeight: '100%', paddingBottom: spacing.xxxl },
  comingTitle: { color: colors.navy, fontFamily: type.black, fontSize: 28, textAlign: 'center' },
  comingBody: { color: colors.muted, fontFamily: type.medium, fontSize: 16, lineHeight: 24, textAlign: 'center' },
});
