import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily } from '@/theme';
import { TrashIcon } from '@/icons';
import type { CartLine } from '@/data/cartTotals';

interface CartLineCardProps {
  line: CartLine;
  onInc: () => void;
  onDec: () => void;
  onRemove: () => void;
}

// Shared by the Cart page and the mini-cart preview sheet — both render an identical line-item card
// (source lines 1256-1291 / 1781-1816, byte-for-byte the same markup in both places).
export const CartLineCard = React.memo(function CartLineCard({ line, onInc, onDec, onRemove }: CartLineCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.swatch, { backgroundColor: line.tint }]} />
        <View style={styles.info}>
          <Text style={styles.name}>{line.name}</Text>
          <Text style={styles.brand}>Brand: {line.brandUpper}</Text>
          {line.hasOffer ? (
            <>
              <View style={styles.priceLine}>
                <Text style={styles.priceGreen}>{line.priceEach}</Text>
                <View style={styles.discountChip}>
                  <Text style={styles.discountText}>{line.discount}</Text>
                </View>
              </View>
              <Text style={styles.mrpText}>
                MRP <Text style={styles.strike}>{line.mrpEach}</Text> for each
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.priceDark}>MRP {line.priceEach}</Text>
              <Text style={styles.mrpText}>for each</Text>
            </>
          )}
        </View>
        <Pressable onPress={onRemove} style={styles.removeButton} hitSlop={6}>
          <TrashIcon size={18} />
        </Pressable>
      </View>
      <View style={styles.bottomRow}>
        <View style={styles.stepper}>
          <Pressable onPress={onDec} style={styles.stepTap} hitSlop={6}>
            <Text style={styles.stepSymbol}>−</Text>
          </Pressable>
          <Text style={styles.stepQty}>{line.qty}</Text>
          <Pressable onPress={onInc} style={styles.stepTap} hitSlop={6}>
            <Text style={styles.stepSymbol}>+</Text>
          </Pressable>
        </View>
        <View style={styles.totalCol}>
          <Text style={styles.totalText}>{line.total}</Text>
          {line.hasOffer && <Text style={styles.mrpTotalText}>MRP {line.mrpTotal}</Text>}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderGray, borderRadius: 16, padding: 12 },
  row: { flexDirection: 'row', gap: 11 },
  swatch: { width: 56, height: 56, borderRadius: 10, flexShrink: 0 },
  info: { flex: 1, minWidth: 0 },
  name: { fontFamily: fontFamily[600], fontSize: 14, lineHeight: 18, color: colors.charcoal },
  brand: { fontFamily: fontFamily[400], fontSize: 10, color: colors.bodyGray, marginTop: 2 },
  priceLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 },
  priceGreen: { fontFamily: fontFamily[700], fontSize: 16, color: colors.brandGreen, letterSpacing: -0.2 },
  priceDark: { fontFamily: fontFamily[700], fontSize: 16, color: colors.charcoal, letterSpacing: -0.2, marginTop: 7 },
  discountChip: { backgroundColor: colors.mintTint, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 4 },
  discountText: { fontFamily: fontFamily[600], fontSize: 10, color: colors.brandGreen },
  mrpText: { fontFamily: fontFamily[400], fontSize: 12, color: colors.bodyGray, marginTop: 3 },
  strike: { textDecorationLine: 'line-through' },
  removeButton: { flexShrink: 0, width: 32, height: 32, borderRadius: 9, backgroundColor: colors.cardBg, alignItems: 'center', justifyContent: 'center' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.brandGreen, borderRadius: 12, padding: 3 },
  stepTap: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  stepSymbol: { fontFamily: fontFamily[700], fontSize: 16, color: colors.white },
  stepQty: { minWidth: 26, textAlign: 'center', fontFamily: fontFamily[700], fontSize: 13, color: colors.white },
  totalCol: { alignItems: 'flex-end' },
  totalText: { fontFamily: fontFamily[700], fontSize: 17, color: colors.charcoal },
  mrpTotalText: { fontFamily: fontFamily[400], fontSize: 12, color: '#9A9A98', textDecorationLine: 'line-through' },
});
