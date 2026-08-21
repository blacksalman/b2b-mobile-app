import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamily } from '@/theme';
import { CartIcon, CloseIcon } from '@/icons';
import { money } from '@/utils/money';
import type { Product } from '@/data/types';

export interface VariantPack {
  key: string;
  label: string;
  price: number;
  mrpBase: number;
  mult: number;
  rating: string;
  margin: string;
}

// Ported verbatim from the source's `variantPacks` (line 1578): 3 fixed packs per product — standard
// (×1, at the product's own price/cmp), "Bulk carton ×6" (×6 the unit price, mrpBase = price*6 so it
// NEVER shows a discount chip since mrpBase===price always), and "Trial pack" (×0.4, discount derived
// from the product's own MRP). `base`/`mrp` fall back to 12 / base*1.18 if the product has neither
// price nor cmp, matching the source exactly (never happens with the current seed catalog, kept for
// parity).
export function buildVariantPacks(product: Product): VariantPack[] {
  const base = product.price || 12;
  const mrp = product.cmp || base * 1.18;
  return [
    { key: `${product.id}_v0`, label: `${product.name} - ${product.cs}`, price: base, mrpBase: mrp, mult: 1, rating: '4.5', margin: '19%' },
    { key: `${product.id}_v1`, label: `${product.name} - Bulk carton ×6`, price: base * 6, mrpBase: base * 6, mult: 6, rating: '4.7', margin: '22%' },
    { key: `${product.id}_v2`, label: `${product.name} - Trial pack`, price: base * 0.4, mrpBase: mrp * 0.4, mult: 0.4, rating: '4.4', margin: '14%' },
  ];
}

interface VariantSheetProps {
  visible: boolean;
  product: Product | null;
  variantCart: Record<string, number>;
  onClose: () => void;
  onAdd: (pack: VariantPack) => void;
  onInc: (pack: VariantPack) => void;
  onDec: (pack: VariantPack) => void;
  onGoCart: () => void;
}

// Ported verbatim from the source's variant-pack bottom sheet (line 1142): 80%-max-height sheet,
// header with product name/brand + close, one card per pack with its own price/MRP/discount, margin
// chip, and independent add/qty-stepper controls. Note the source's own quirk, replicated as-is: the
// per-pack stepper tracks its own small counter (`variantCart[key]`), but tapping +/-/Add ALSO nudges
// the MAIN product's cart quantity by the pack's `mult` (so the "Bulk carton ×6" pack adds 6 to the
// main product's cart count per tap, and "Trial pack" adds 0.4) — two independent numbers, not one.
export function VariantSheet({ visible, product, variantCart, onClose, onAdd, onInc, onDec, onGoCart }: VariantSheetProps) {
  const insets = useSafeAreaInsets();
  if (!product) return null;
  const packs = buildVariantPacks(product);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{product.name}</Text>
            <Text style={styles.subtitle}>Brand: {product.brand}</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
            <CloseIcon size={13} color={colors.charcoal} strokeWidth={2.2} />
          </Pressable>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={[styles.bodyContent, { paddingBottom: 14 + insets.bottom }]}>
          {packs.map((pack) => {
            const qty = variantCart[pack.key] || 0;
            const inCart = qty > 0;
            const hasDiscount = pack.mrpBase > pack.price;
            const discount = hasDiscount ? '-' + Math.round((1 - pack.price / pack.mrpBase) * 100) + '%' : '';
            return (
              <View key={pack.key} style={styles.packRow}>
                <View style={[styles.swatch, { backgroundColor: product.tint }]}>
                  {!!discount && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountBadgeText}>{discount}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.packInfo}>
                  <Text style={styles.packLabel}>{pack.label}</Text>
                  <View style={styles.marginChip}>
                    <Text style={styles.marginText}>Margin {pack.margin}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.priceRow}>
                    <View>
                      {hasDiscount ? (
                        <>
                          <View style={styles.priceLine}>
                            <Text style={styles.priceGreen}>{money(pack.price)}</Text>
                            <View style={styles.discountChip}>
                              <Text style={styles.discountChipText}>{discount}</Text>
                            </View>
                          </View>
                          <Text style={styles.mrpText}>
                            MRP <Text style={styles.strike}>{money(pack.mrpBase)}</Text>
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.priceDark}>MRP {money(pack.price)}</Text>
                      )}
                    </View>
                    {inCart ? (
                      <View style={styles.stepperRow}>
                        <View style={styles.compactStepper}>
                          <Pressable onPress={() => onDec(pack)} style={styles.compactTap} hitSlop={6}>
                            <Text style={styles.compactSymbol}>−</Text>
                          </Pressable>
                          <Text style={styles.compactQty}>{qty}</Text>
                          <Pressable onPress={() => onInc(pack)} style={styles.compactTap} hitSlop={6}>
                            <Text style={styles.compactSymbol}>+</Text>
                          </Pressable>
                        </View>
                        <Pressable onPress={onGoCart} style={styles.cartIconButton}>
                          <CartIcon size={14} color={colors.brandGreen} />
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable onPress={() => onAdd(pack)} style={styles.addButton}>
                        <CartIcon size={12} color={colors.white} />
                        <Text style={styles.addButtonText}>Add</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.4)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '80%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: { flex: 1, paddingRight: 12 },
  title: { fontFamily: fontFamily[700], fontSize: 16, color: colors.charcoal },
  subtitle: { fontFamily: fontFamily[400], fontSize: 11, color: colors.bodyGray, marginTop: 2 },
  closeButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.cardBg, alignItems: 'center', justifyContent: 'center' },
  body: { flexGrow: 0 },
  bodyContent: { padding: 14, paddingTop: 14 },
  packRow: {
    flexDirection: 'row',
    gap: 11,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 16,
    padding: 11,
    marginBottom: 12,
  },
  swatch: { width: 88, height: 88, borderRadius: 12, flexShrink: 0 },
  discountBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: colors.gold, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3 },
  discountBadgeText: { fontFamily: fontFamily[600], fontSize: 9, color: colors.charcoal },
  packInfo: { flex: 1, minWidth: 0 },
  packLabel: { fontFamily: fontFamily[600], fontSize: 12.5, lineHeight: 16, color: colors.charcoal },
  marginChip: { backgroundColor: colors.mintTint, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4, alignSelf: 'flex-start', marginTop: 6 },
  marginText: { fontFamily: fontFamily[600], fontSize: 9.5, color: colors.brandGreen },
  divider: { height: 1, backgroundColor: colors.borderGray, marginVertical: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  priceLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  priceGreen: { fontFamily: fontFamily[700], fontSize: 14, color: colors.brandGreen },
  priceDark: { fontFamily: fontFamily[700], fontSize: 14, color: colors.charcoal },
  discountChip: { backgroundColor: colors.mintTint, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3 },
  discountChipText: { fontFamily: fontFamily[600], fontSize: 9.5, color: colors.brandGreen },
  mrpText: { fontFamily: fontFamily[400], fontSize: 10.5, color: colors.bodyGray, marginTop: 2 },
  strike: { textDecorationLine: 'line-through' },
  stepperRow: { flexDirection: 'row', gap: 6 },
  compactStepper: {
    width: 82,
    height: 38,
    borderRadius: 11,
    backgroundColor: colors.brandGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  compactTap: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  compactSymbol: { fontFamily: fontFamily[700], fontSize: 15, color: colors.white },
  compactQty: { fontFamily: fontFamily[700], fontSize: 12, color: colors.white },
  cartIconButton: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1.6,
    borderColor: colors.brandGreen,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    height: 38,
    borderRadius: 11,
    backgroundColor: colors.brandGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
  },
  addButtonText: { fontFamily: fontFamily[600], fontSize: 12, color: colors.white },
});
