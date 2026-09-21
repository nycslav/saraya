import { LinearGradient } from 'expo-linear-gradient';
import { CalendarDays, Sparkles } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type } from '@/ui/theme';

const gradients = {
  sky: ['#DDF5FD', '#0BA6DF'],
  sunset: ['#FFF0D1', '#EF7722'],
  forest: ['#DDF4EA', '#18825C'],
  lagoon: ['#DDF5FD', '#00A6A6'],
  violet: ['#ECE6FA', '#7756B3'],
  gold: ['#FFF0D1', '#FAA533'],
} as const;

export function FestivalArtwork({
  label,
  month,
  tone,
  compact = false,
}: {
  label: string;
  month: string;
  tone: keyof typeof gradients;
  compact?: boolean;
}) {
  return (
    <LinearGradient
      accessibilityLabel={`${label} festival artwork`}
      colors={gradients[tone]}
      style={[styles.artwork, compact && styles.compact]}
    >
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />
      <Sparkles color={colors.white} size={compact ? 26 : 42} strokeWidth={2.4} />
      <View style={styles.monthBadge}>
        <CalendarDays color={colors.navy} size={14} />
        <Text style={styles.month}>{month}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  artwork: {
    height: 152,
    padding: spacing.lg,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  compact: { width: 98, height: 112, borderRadius: radius.md },
  glowOne: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.24)',
    right: -34,
    top: -42,
  },
  glowTwo: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.18)',
    left: -20,
    bottom: -24,
  },
  monthBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  month: { color: colors.navy, fontFamily: type.black, fontSize: 12 },
});
