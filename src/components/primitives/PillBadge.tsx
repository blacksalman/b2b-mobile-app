import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { fontFamily } from '@/theme';

interface PillBadgeProps {
  label: string;
  background: string;
  color: string;
  fontSize?: number;
  weight?: 500 | 600 | 700;
  radius?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  style?: ViewStyle;
}

export function PillBadge({
  label,
  background,
  color,
  fontSize = 10,
  weight = 600,
  radius = 5,
  paddingHorizontal = 7,
  paddingVertical = 4,
  style,
}: PillBadgeProps) {
  return (
    <View
      style={[
        styles.base,
        { backgroundColor: background, borderRadius: radius, paddingHorizontal, paddingVertical },
        style,
      ]}
    >
      <Text style={{ fontFamily: fontFamily[weight], fontSize, color }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
  },
});
