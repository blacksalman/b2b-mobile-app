import React from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { ds, dsFontFamily, dsRadii, dsSpacing } from '@/theme';
import { FabChevronIcon } from '@/icons';
import { useAppState } from '@/state/AppStateContext';

interface MiniCartFabProps {
  bottomOffset: number;
  onPress: () => void;
  onLayout?: (e: LayoutChangeEvent) => void;
}

// Rebuilt against the new AyurvedaOne design system (various-mobile-app-phone.dc.html line ~2440,
// `showMiniCartFab`). The new source drops the old bar's "Preview"/"Checkout" split entirely — it's
// now a single floating pill ("{cartCount} items · View cart") that taps straight through to Cart, no
// preview sheet. Visibility (cart non-empty, allowed screen) is still gated by the caller — see
// `(tabs)/_layout.tsx`.
export function MiniCartFab({ bottomOffset, onPress, onLayout }: MiniCartFabProps) {
  const { cartTotals } = useAppState();
  const { cartCount } = cartTotals;

  return (
    <View style={[styles.wrap, { bottom: bottomOffset, pointerEvents: 'box-none' }]} onLayout={onLayout}>
      <Pressable onPress={onPress} style={styles.pill}>
        <Text style={styles.label} numberOfLines={1}>{cartCount} items · View cart</Text>
        <View style={styles.chevronBox}>
          <FabChevronIcon size={20} color={ds.surface} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dsSpacing.sm,
    height: 44,
    paddingLeft: dsSpacing.lg,
    paddingRight: 4,
    borderRadius: dsRadii.pill,
    backgroundColor: ds.primaryStrong,
    boxShadow: '0 4px 16px rgba(12,71,51,.24)',
  },
  label: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.surface },
  chevronBox: { flexShrink: 0, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
