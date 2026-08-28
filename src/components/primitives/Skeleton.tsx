import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { ds, dsRadii } from '@/theme';

// Plain static placeholder box - no shimmer/pulse animation, matching this app's existing
// "loading" convention (ActivityIndicator in categoriesApi.ts/categories.tsx) of staying simple
// rather than introducing new animation machinery. Used to reserve a section's real layout space
// while its data is still in flight, so content doesn't jump/reflow when it arrives - see Home
// screen's per-section skeletons (index.tsx).
interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, radius = dsRadii.input, style }: SkeletonProps) {
  return <View style={[styles.base, { width, height, borderRadius: radius }, style]} />;
}

const styles = StyleSheet.create({
  base: { backgroundColor: ds.line },
});
