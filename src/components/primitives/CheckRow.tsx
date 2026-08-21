import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily } from '@/theme';

interface CheckRowProps {
  label: string;
  selected: boolean;
  shape: 'square' | 'circle';
  onPress: () => void;
}

// Ported verbatim from the filter-sheet option rows (e.g. line 659): 19x19 indicator, square (radius
// 5) for Brand/Availability/Ingredients/Concern/Product form, circle for Sort By/Price. Selected =
// filled brand-green; unselected = transparent with a faint border. This mirrors the source's `sel()`
// border/bg2 pair used purely for filter-sheet display — selections are inert (do not filter results),
// replicated as-is per the fidelity rule.
export function CheckRow({ label, selected, shape, onPress }: CheckRowProps) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.indicator,
          shape === 'circle' ? styles.circle : styles.square,
          {
            borderColor: selected ? colors.brandGreen : 'rgba(0,0,0,.18)',
            backgroundColor: selected ? colors.brandGreen : 'transparent',
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  label: {
    fontFamily: fontFamily[600],
    fontSize: 12.5,
    color: colors.charcoal,
  },
  indicator: {
    width: 19,
    height: 19,
    borderWidth: 1.6,
  },
  square: { borderRadius: 5 },
  circle: { borderRadius: 9999 },
});
