import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily } from '@/theme';
import { LeafOutlineIcon } from '@/icons';

interface CategoryRailItemProps {
  name: string;
  active: boolean;
  onPress: () => void;
}

// Ported verbatim from the Categories screen's left rail (line 530): 74px column, active state =
// green left border + light bg + tinted icon circle.
export function CategoryRailItem({ name, active, onPress }: CategoryRailItemProps) {
  const color = active ? colors.brandGreen : colors.bodyGray;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.item,
        { borderLeftColor: active ? colors.brandGreen : 'transparent', backgroundColor: active ? colors.cardBg : colors.white },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: active ? colors.mintTint : colors.cardBg }]}>
        <LeafOutlineIcon size={17} color={active ? colors.brandGreen : '#9A9A98'} />
      </View>
      <Text style={[styles.label, { color }]}>{name}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    width: 74,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderLeftWidth: 3,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fontFamily[600],
    fontSize: 9.5,
    lineHeight: 12,
    textAlign: 'center',
    marginTop: 6,
  },
});
