import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily } from '@/theme';

interface QtyStepperProps {
  qty: number;
  onInc: () => void;
  onDec: () => void;
  height?: number;
  variant?: 'pill' | 'square';
}

// Pill variant ported verbatim from the source's product-card cart stepper (e.g. line 162):
// green pill, white 30x30 tap targets, "−"/"+" text glyphs (not icons) — flex:1 inside its row.
export function QtyStepper({ qty, onInc, onDec, height = 46, variant = 'pill' }: QtyStepperProps) {
  const isPill = variant === 'pill';
  return (
    <View
      style={[
        styles.base,
        {
          height,
          borderRadius: isPill ? 999 : 9,
          backgroundColor: isPill ? colors.brandGreen : colors.white,
        },
      ]}
    >
      <Pressable onPress={onDec} style={styles.tap} hitSlop={8}>
        <Text style={[styles.symbol, { color: isPill ? colors.white : colors.brandGreen }]}>−</Text>
      </Pressable>
      <Text style={[styles.qty, { color: isPill ? colors.white : colors.charcoal }]}>{qty}</Text>
      <Pressable onPress={onInc} style={styles.tap} hitSlop={8}>
        <Text style={[styles.symbol, { color: isPill ? colors.white : colors.brandGreen }]}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  tap: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: {
    fontFamily: fontFamily[700],
    fontSize: 17,
  },
  qty: {
    fontFamily: fontFamily[700],
    fontSize: 13,
  },
});
