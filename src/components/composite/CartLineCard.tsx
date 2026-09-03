import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { ds, dsFontFamily, dsRadii, dsSpacing, dsElevation } from '@/theme';
import { TrashIcon } from '@/icons';
import type { CartLine } from '@/data/cartTotals';

interface CartLineCardProps {
  line: CartLine;
  onInc: () => void;
  onDec: () => void;
  onRemove: () => void;
  // Set by Cart (cartApi.ts's mutatingLineIds) while this line's own qty/remove mutation is in
  // flight - shows a small spinner in place of the qty number and ignores taps meanwhile, instead
  // of Cart hiding its whole line list behind a full-page loader for the mutation's duration.
  // Optional and unused by MiniCartSheet, which doesn't drive real cart mutations from its rows.
  busy?: boolean;
}

// Rebuilt against the new AyurvedaOne design system (screen_Cart.html, byte-for-byte identical
// markup for the Cart page and the mini-cart preview). Unlike the old card, price/total no longer
// swap to a "MRP {x}" dark-text style when the line has no offer — priceEach is always shown in
// primaryInk, and "for each" is always shown (not conditional on hasOffer). The stepper's dec button
// swaps to a trash glyph at qty 1 (the exact bug this round was asked to fix), matching DsProductCard.
//
// `thumbnail` (optional on CartLine) shows a real product photo when the caller has one - cart.tsx
// now passes real cart data through this same CartLine shape (see its own adapter), MiniCartSheet
// still doesn't, so it keeps rendering the plain tint placeholder exactly as before, unchanged.
//
// `discount` was already a computed CartLine field but never rendered here - added as a small
// chip next to the struck MRP (same discountChip pattern DsProductCard uses) so each line shows
// its OWN real discount%, rather than only a blended average across every line in the cart
// (which the Order summary's Total row used to show and doesn't correspond to any single
// product).
export const CartLineCard = React.memo(function CartLineCard({ line, onInc, onDec, onRemove, busy }: CartLineCardProps) {
  const atOne = line.qty <= 1;
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.swatch, { backgroundColor: line.tint }]}>
          {line.thumbnail && <Image source={{ uri: line.thumbnail }} style={styles.thumbImage} contentFit="contain" />}
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>{line.name}</Text>
          <Text style={styles.brand} numberOfLines={1}>{line.brandUpper}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceEach}>{line.priceEach}</Text>
            {line.hasOffer && <Text style={styles.mrpEach}>{line.mrpEach}</Text>}
            {line.hasOffer && !!line.discount && (
              <View style={styles.discountChip}>
                <Text style={styles.discountChipText}>{line.discount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.forEach}>for each</Text>
        </View>
        <Pressable onPress={onRemove} style={styles.removeButton} hitSlop={6} disabled={busy}>
          <TrashIcon size={18} color={ds.dangerInk} />
        </Pressable>
      </View>
      <View style={styles.divider} />
      <View style={styles.bottomRow}>
        <View style={styles.stepper}>
          <Pressable onPress={onDec} style={styles.stepTap} hitSlop={6} disabled={busy}>
            {atOne ? <TrashIcon size={14} color={ds.dangerInk} /> : <Text style={styles.stepSymbol}>−</Text>}
          </Pressable>
          {busy ? (
            <ActivityIndicator size="small" color={ds.primaryInk} />
          ) : (
            <Text style={styles.stepQty}>{line.qty}</Text>
          )}
          <Pressable onPress={onInc} style={styles.stepTap} hitSlop={6} disabled={busy}>
            <Text style={styles.stepSymbol}>+</Text>
          </Pressable>
        </View>
        <View style={styles.totalCol}>
          {line.hasOffer && <Text style={styles.mrpTotal}>{line.mrpTotal}</Text>}
          <Text style={styles.total}>{line.total}</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: ds.surface,
    borderWidth: 1,
    borderColor: ds.line,
    borderRadius: dsRadii.button,
    padding: dsSpacing.md,
    ...dsElevation.e1,
  },
  row: { flexDirection: 'row', gap: dsSpacing.md },
  swatch: { width: 72, height: 72, borderRadius: dsRadii.input, flexShrink: 0, overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%' },
  info: { flex: 1, minWidth: 0 },
  name: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink },
  brand: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink2, marginTop: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: dsSpacing.sm, marginTop: dsSpacing.sm },
  priceEach: { fontFamily: dsFontFamily[700], fontSize: 18, lineHeight: 24, color: ds.primaryInk },
  mrpEach: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink3, textDecorationLine: 'line-through' },
  discountChip: { backgroundColor: ds.primarySoft, borderRadius: dsRadii.chip, paddingHorizontal: 6, paddingVertical: 2 },
  discountChipText: { fontFamily: dsFontFamily[600], fontSize: 11, lineHeight: 14, letterSpacing: 0.22, color: ds.primaryInk },
  forEach: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink2, marginTop: 4 },
  removeButton: { flexShrink: 0, width: 32, height: 32, borderRadius: dsRadii.input, backgroundColor: ds.canvas, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, backgroundColor: ds.line, marginVertical: dsSpacing.md },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: {
    minWidth: 116,
    height: 40,
    borderRadius: dsRadii.button,
    backgroundColor: ds.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  stepTap: { width: 34, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepSymbol: { fontFamily: dsFontFamily[700], fontSize: 18, lineHeight: 24, color: ds.primaryInk },
  stepQty: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.primaryInk },
  totalCol: { alignItems: 'flex-end' },
  mrpTotal: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink3, textDecorationLine: 'line-through' },
  total: { fontFamily: dsFontFamily[700], fontSize: 18, lineHeight: 24, color: ds.ink },
});
