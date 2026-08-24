import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ds, dsFontFamily, dsRadii, dsSpacing, dsElevation } from '@/theme';
import { TrashIcon } from '@/icons';
import type { CartLine } from '@/data/cartTotals';

interface CartLineCardProps {
  line: CartLine;
  onInc: () => void;
  onDec: () => void;
  onRemove: () => void;
}

// Rebuilt against the new AyurvedaOne design system (screen_Cart.html, byte-for-byte identical
// markup for the Cart page and the mini-cart preview). Unlike the old card, price/total no longer
// swap to a "MRP {x}" dark-text style when the line has no offer — priceEach is always shown in
// primaryInk, and "for each" is always shown (not conditional on hasOffer). The stepper's dec button
// swaps to a trash glyph at qty 1 (the exact bug this round was asked to fix), matching DsProductCard.
export const CartLineCard = React.memo(function CartLineCard({ line, onInc, onDec, onRemove }: CartLineCardProps) {
  const atOne = line.qty <= 1;
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.swatch, { backgroundColor: line.tint }]} />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>{line.name}</Text>
          <Text style={styles.brand} numberOfLines={1}>{line.brandUpper}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceEach}>{line.priceEach}</Text>
            {line.hasOffer && <Text style={styles.mrpEach}>{line.mrpEach}</Text>}
          </View>
          <Text style={styles.forEach}>for each</Text>
        </View>
        <Pressable onPress={onRemove} style={styles.removeButton} hitSlop={6}>
          <TrashIcon size={18} color={ds.dangerInk} />
        </Pressable>
      </View>
      <View style={styles.divider} />
      <View style={styles.bottomRow}>
        <View style={styles.stepper}>
          <Pressable onPress={onDec} style={styles.stepTap} hitSlop={6}>
            {atOne ? <TrashIcon size={14} color={ds.dangerInk} /> : <Text style={styles.stepSymbol}>−</Text>}
          </Pressable>
          <Text style={styles.stepQty}>{line.qty}</Text>
          <Pressable onPress={onInc} style={styles.stepTap} hitSlop={6}>
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
  swatch: { width: 72, height: 72, borderRadius: dsRadii.input, flexShrink: 0 },
  info: { flex: 1, minWidth: 0 },
  name: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink },
  brand: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink2, marginTop: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: dsSpacing.sm, marginTop: dsSpacing.sm },
  priceEach: { fontFamily: dsFontFamily[700], fontSize: 18, lineHeight: 24, color: ds.primaryInk },
  mrpEach: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink3, textDecorationLine: 'line-through' },
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
