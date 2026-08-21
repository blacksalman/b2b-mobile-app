import React from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { colors, fontFamily } from '@/theme';
import { useAppState } from '@/state/AppStateContext';

interface MiniCartFabProps {
  bottomOffset: number;
  onPreview: () => void;
  onCheckout: () => void;
  onLayout?: (e: LayoutChangeEvent) => void;
}

// Ported verbatim from `showMiniCartFab` (source line 1751): a floating bar pinned just above the tab
// bar showing the cart total + item count, "Preview" (opens the mini-cart sheet) and "Checkout"
// (skips straight past the Cart page). Visibility (cart non-empty, sheet closed, allowed screen) is
// gated by the caller — see `(tabs)/_layout.tsx`.
export function MiniCartFab({ bottomOffset, onPreview, onCheckout, onLayout }: MiniCartFabProps) {
  const { cartTotals } = useAppState();
  const { total, mrpTotal, cartHasDiscount, cartCount } = cartTotals;

  return (
    <View style={[styles.bar, { bottom: bottomOffset }]} onLayout={onLayout}>
      <View style={styles.info}>
        <View style={styles.totalRow}>
          <Text style={styles.total}>{total}</Text>
          {cartHasDiscount && <Text style={styles.mrp}>{mrpTotal}</Text>}
        </View>
        <Text style={styles.count}>{cartCount} items in cart</Text>
      </View>
      <Pressable onPress={onPreview} style={styles.previewButton}>
        <Text style={styles.previewText}>Preview</Text>
      </Pressable>
      <Pressable onPress={onCheckout} style={styles.checkoutButton}>
        <Text style={styles.checkoutText}>Checkout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 15,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  info: { flex: 1, minWidth: 0 },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  total: { fontFamily: fontFamily[700], fontSize: 18, color: colors.charcoal, letterSpacing: -0.2 },
  mrp: { fontFamily: fontFamily[400], fontSize: 11.5, color: '#9A9A98', textDecorationLine: 'line-through' },
  count: { fontFamily: fontFamily[400], fontSize: 11, color: colors.bodyGray, marginTop: 2 },
  previewButton: {
    flexShrink: 0,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.6,
    borderColor: colors.brandGreen,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  previewText: { fontFamily: fontFamily[600], fontSize: 13, color: colors.brandGreen },
  checkoutButton: {
    flexShrink: 0,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  checkoutText: { fontFamily: fontFamily[600], fontSize: 13, color: colors.white },
});
