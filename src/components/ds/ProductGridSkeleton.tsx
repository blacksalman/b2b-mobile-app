import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { dsRadii, dsSpacing } from '@/theme';
import { Skeleton } from '@/components/primitives/Skeleton';

// Shared 2-column placeholder grid for a product listing's initial loading state - reserves the
// real layout (matching DsProductCard at width="48%") while a search/browse fetch is still in
// flight, so results feel like they're streaming in rather than appearing after a blank wait.
// Used by both Search (search.tsx) and Categories (categories.tsx) - the two screens structure
// their own horizontal padding differently (Search's FlatList applies it at the container level,
// Categories' doesn't), so `style` lets each caller add whatever padding its own layout needs
// rather than this component guessing.
interface ProductGridSkeletonProps {
  count?: number;
  style?: ViewStyle;
}

export function ProductGridSkeleton({ count = 6, style }: ProductGridSkeletonProps) {
  return (
    <View style={[styles.grid, style]}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} width="48%" height={248} radius={dsRadii.sheet} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: dsSpacing.md, marginTop: dsSpacing.md },
});
