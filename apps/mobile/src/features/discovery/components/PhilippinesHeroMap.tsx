import type { IslandGroup } from '@saraya/contracts';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, radius, spacing, type } from '@/ui/theme';

const regionColors: Record<IslandGroup, string> = {
  Luzon: '#00AEEF',
  Visayas: '#FDB813',
  Mindanao: '#FF5A5F',
};

export function PhilippinesHeroMap({ onSelect, enabled }: {
  onSelect: (region: IslandGroup) => void;
  enabled: Record<IslandGroup, boolean>;
}) {
  return (
    <View accessibilityLabel="Map of the Philippines with buttons for Luzon, Visayas, and Mindanao" style={styles.container}>
      <Svg height="100%" viewBox="0 0 320 430" width="100%">
        <Path d="M154 19c20 3 37 18 36 39-1 13-11 22-9 35 2 11 14 19 9 31-5 13-22 13-27 26-5 12 4 25-4 37-7 11-24 12-35 4-11-9-12-24-7-37 5-12 16-21 15-35-1-13-13-23-11-37 2-13 14-20 18-31 3-10 2-25 15-32z" fill={regionColors.Luzon} />
        <Path d="M108 152c8 5 12 15 8 24-3 7-11 8-16 14-6 8-5 20-12 27-5 5-14 6-17 0-4-8 4-17 7-24 4-10 2-23 9-32 5-7 13-13 21-9z" fill={regionColors.Luzon} />
        <Path d="M118 202c8-5 17-4 24 1 5 4 7 12 13 14 7 3 15-1 21 4 5 5 4 14-1 19-6 6-15 3-22 7-8 4-13 14-23 13-9-1-13-10-10-18 2-7 10-12 8-20-1-7-15-12-10-20z" fill={regionColors.Visayas} />
        <Path d="M184 206c8-3 18 0 21 8 4 9-3 17-3 26 1 8 9 14 7 22-2 7-10 11-17 8-8-4-8-14-15-19-6-5-16-4-20-11-4-8 2-17 10-19 7-3 10-12 17-15z" fill={regionColors.Visayas} />
        <Path d="M220 222c6 2 10 8 8 14-2 7-10 8-14 13-4 5-2 14-8 17-5 3-11-1-12-7-2-7 5-12 8-18 3-7 1-17 7-20 3-2 7-1 11 1z" fill={regionColors.Visayas} />
        <Path d="M101 238c5-2 10 1 11 6 1 6-5 9-9 12-4 4-5 11-10 13-5 2-10-2-9-7 1-6 7-9 9-14 2-4 3-8 8-10z" fill={regionColors.Visayas} />
        <Path d="M163 277c13-9 31-9 44-2 10 5 18 14 29 15 12 2 24-6 35-1 10 5 13 18 9 28-4 11-15 17-20 27-5 12-2 27-12 36-9 9-24 8-34 2-10-5-18-15-29-18-13-3-28 3-38-5-10-8-11-23-5-34 6-11 19-16 21-29 2-10-10-20-2-29z" fill={regionColors.Mindanao} />
        <Path d="M131 300c7-3 14 2 14 9 1 8-8 12-11 19-4 7-1 17-7 22-5 4-13 1-15-5-3-8 4-15 7-22 3-8 2-18 8-22l4-1z" fill={regionColors.Mindanao} />
      </Svg>

      <RegionHotspot color={regionColors.Luzon} disabled={!enabled.Luzon} label="Luzon" onPress={() => onSelect('Luzon')} style={styles.luzon} />
      <RegionHotspot color={regionColors.Visayas} disabled={!enabled.Visayas} label="Visayas" onPress={() => onSelect('Visayas')} style={styles.visayas} />
      <RegionHotspot color={regionColors.Mindanao} disabled={!enabled.Mindanao} label="Mindanao" onPress={() => onSelect('Mindanao')} style={styles.mindanao} />
    </View>
  );
}

function RegionHotspot({ label, color, onPress, disabled, style }: {
  label: IslandGroup;
  color: string;
  onPress: () => void;
  disabled: boolean;
  style: object;
}) {
  return (
    <Pressable
      accessibilityHint={`Scrolls to ${label} destinations`}
      accessibilityLabel={`${label} region`}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.hotspot, style, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { height: 430, borderRadius: radius.lg, backgroundColor: '#F2FAFD', overflow: 'hidden', position: 'relative', paddingVertical: spacing.sm },
  hotspot: { position: 'absolute', minHeight: 48, minWidth: 104, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  luzon: { left: 12, top: 76 },
  visayas: { right: 10, top: 206 },
  mindanao: { left: 12, top: 318 },
  swatch: { width: 12, height: 12, borderRadius: 6 },
  label: { color: colors.navy, fontFamily: type.black, fontSize: 14 },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.55 },
});
