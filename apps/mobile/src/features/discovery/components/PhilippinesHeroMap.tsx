import type { IslandGroup } from '@saraya/contracts';
import { Fragment, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { spacing, type } from '@/ui/theme';

import {
  PHILIPPINES_MAP_VIEW_BOX,
  philippinesMapArtwork,
} from './PhilippinesMapPaths';

const regions: {
  color: string;
  hitZones: readonly ViewStyle[];
  labelAnchor: ViewStyle;
  labelPosition: TextStyle;
  layerPosition: ViewStyle;
  name: IslandGroup;
  primaryHitZone: number;
}[] = [
  {
    name: 'Luzon',
    color: '#59d3ff',
    layerPosition: { left: '6.5%', top: '0.3%' },
    hitZones: [{ left: '18%', top: '7%', width: '75%', height: '35%' }],
    labelAnchor: { left: '18%', top: '7%', width: '75%', height: '35%' },
    labelPosition: { right: '80%', top: '30%' },
    primaryHitZone: 0,
  },
  {
    name: 'Visayas',
    color: '#ffc849',
    layerPosition: { left: '6%', top: '0.6%' },
    hitZones: [
      { left: '40%', top: '38%', width: '50%', height: '12%' },
      { left: '8%', top: '50%', width: '52%', height: '12%' },
      { left: '60%', top: '50%', width: '16%', height: '12%' },
    ],
    labelAnchor: { left: '8%', top: '44%', width: '82%', height: '18%' },
    labelPosition: { left: 90, top: '53%' },
    primaryHitZone: 1,
  },
  {
    name: 'Mindanao',
    color: '#fa7074',
    layerPosition: { left: '12%', top: '4.5%' },
    hitZones: [
      { left: '76%', top: '50%', width: '22%', height: '12%' },
      { left: '33%', top: '62%', width: '65%', height: '29%' },
    ],
    labelAnchor: { left: '8%', top: '64%', width: '90%', height: '27%' },
    labelPosition: { right: 70, top: '30%' },
    primaryHitZone: 1,
  },
];

export function PhilippinesHeroMap({
  onSelect,
  enabled,
}: {
  onSelect: (region: IslandGroup) => void;
  enabled: Record<IslandGroup, boolean>;
}) {
  const [pressedRegion, setPressedRegion] = useState<IslandGroup | null>(null);

  return (
    <View style={styles.container}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.fill}
      >
        {regions.map((region) => (
          <View
            key={region.name}
            style={[
              styles.imageLayer,
              region.layerPosition,
              pressedRegion === region.name && styles.activeShadow,
            ]}
            testID={`map-layer-${region.name.toLowerCase()}`}
          >
            <Svg
              height="100%"
              style={styles.image}
              viewBox={PHILIPPINES_MAP_VIEW_BOX}
              width="100%"
            >
              <Path
                d={philippinesMapArtwork[region.name].path}
                fill={philippinesMapArtwork[region.name].fill}
                fillRule="evenodd"
              />
            </Svg>
          </View>
        ))}
      </View>

      {regions.map((region) => {
        const disabled = !enabled[region.name];

        return (
          <Fragment key={region.name}>
            {region.hitZones.map((hitZone, index) => {
              const isPrimary = index === region.primaryHitZone;

              return (
                <Pressable
                  accessible={isPrimary}
                  accessibilityHint={
                    isPrimary
                      ? `Scrolls to ${region.name} destinations`
                      : undefined
                  }
                  accessibilityLabel={
                    isPrimary ? `${region.name} region` : undefined
                  }
                  accessibilityRole={isPrimary ? 'button' : undefined}
                  accessibilityState={isPrimary ? { disabled } : undefined}
                  disabled={disabled}
                  focusable={isPrimary}
                  key={`${region.name}-${index}`}
                  onPress={() => {
                    setPressedRegion(null);
                    onSelect(region.name);
                  }}
                  onPressIn={() => setPressedRegion(region.name)}
                  onPressOut={() => setPressedRegion(null)}
                  style={({ pressed }) => [
                    styles.hitZone,
                    hitZone,
                    pressed && styles.hitZonePressed,
                  ]}
                  testID={
                    isPrimary
                      ? `map-region-${region.name.toLowerCase()}`
                      : `map-region-${region.name.toLowerCase()}-zone-${index}`
                  }
                />
              );
            })}

            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              pointerEvents="none"
              style={[
                styles.labelAnchor,
                region.labelAnchor,
                pressedRegion === region.name && styles.hitZonePressed,
                disabled && styles.disabled,
              ]}
            >
              <Text
                maxFontSizeMultiplier={1.3}
                numberOfLines={1}
                style={[styles.label, region.labelPosition, { color: region.color }]}
                testID={`map-label-${region.name.toLowerCase()}`}
              >
                {region.name}
              </Text>
            </View>
          </Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 377,
    aspectRatio: 377 / 720,
    alignSelf: 'center',
    marginTop: spacing.lg,
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    pointerEvents: 'none',
  },
  imageLayer: {
    position: 'absolute',
    width: '100%',
    aspectRatio: 377 / 661,
    ...Platform.select({
      web: { boxShadow: '0 3px 4px rgba(0, 0, 0, 0.06)' },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  activeShadow: {
    ...Platform.select({
      web: { boxShadow: '0 7px 10px rgba(0, 0, 0, 0.3)' },
      default: {
        shadowOpacity: 0.3,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 7 },
        elevation: 8,
      },
    }),
    transform: [{ translateY: -2 }, { scale: 1.01 }],
  },
  image: {
    width: '100%',
    height: '100%',
  },
  hitZone: {
    position: 'absolute',
    minWidth: 48,
    minHeight: 48,
    backgroundColor: 'transparent',
  },
  labelAnchor: {
    position: 'absolute',
  },
  hitZonePressed: {
    opacity: 0.82,
  },
  label: {
    position: 'absolute',
    fontFamily: type.black,
    fontSize: 16,
    lineHeight: 22,
  },
  disabled: {
    opacity: 0.5,
  },
});
