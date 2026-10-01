import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/ui/components';
import { colors, spacing, type } from '@/ui/theme';

export function PreferenceGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.options}>
        {options.map((option) => (
          <Chip
            key={String(option)}
            label={typeof option === 'number' ? `${option} days` : option}
            onPress={() => onChange(option)}
            selected={option === value}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  label: { color: colors.navy, fontFamily: type.black, fontSize: 15 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
