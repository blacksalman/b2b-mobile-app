import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ds, dsElevation, dsFontFamily, dsRadii, dsSpacing, dsType } from '@/theme';
import { CartIcon, CloseIcon, TrashIcon } from '@/icons';
import { money } from '@/utils/money';
import { useAppState } from '@/state/AppStateContext';
import { useApiCartActions } from '@/data/useApiCartActions';
import { registerApiProductVariant } from '@/data/cartSync';
import { hashProductId } from '@/data/idHash';
import { decorateProduct } from '@/data/decorateProduct';
import type { Product } from '@/data/types';

// Unrelated to the real-variant sheet below - still backs product/[id].tsx's own mock pack-size
// grid (the "×1 / Bulk carton ×6 / Trial pack" split shown for products with no real Medusa
// variants at all), kept as-is/untouched by this file's real-variant popup rewrite.
export interface VariantPack {
  key: string;
  label: string;
  price: number;
  mrpBase: number;
  mult: number;
  rating: string;
  margin: string;
}

const BULK = 0.94;

export function buildVariantPacks(product: Product): VariantPack[] {
  const base = product.price || 12;
  const mrp = product.cmp || base * 1.18;
  const m = 14 + ((product.id * 5) % 12); // marginOf(p), source line 2557
  return [
    { key: `${product.id}_v0`, label: product.cs, price: base, mrpBase: mrp, mult: 1, rating: '4.5', margin: `${m}%` },
    { key: `${product.id}_v1`, label: 'Bulk carton × 6', price: base * 6 * BULK, mrpBase: mrp * 6, mult: 6, rating: '4.7', margin: `${m + 3}%` },
    { key: `${product.id}_v2`, label: 'Trial pack', price: base * 0.4, mrpBase: mrp * 0.4, mult: 0.4, rating: '4.4', margin: `${m - 5}%` },
  ];
}

interface VariantSheetProps {
  visible: boolean;
  product: Product | null;
  onClose: () => void;
}

// Real-variant popup for "Select option" (DsProductCard, whenever product.realVariants has more
// than one entry) - opened from a grid/rail card so the customer can pick the actual variant
// (e.g. Swarnaprashana's "0-1 Yr"/"1-5 Yrs"/...) and add it right there, instead of being
// dumped onto the Product Detail page. Not to be confused with buildVariantPacks above (a
// different, still-mock feature) - each row here is one of the product's genuine variants, same
// price/cmp/inStock product.realVariants (homeApi.ts's buildRealVariantOptions) already carries,
// already tax-inclusive and already labeled with the real per-option value (not the
// product-name-prefixed variant.title).
//
// Each row is wired to the real cart exactly like the Product Detail page's own variant grid:
// hashProductId(variant.id) is its own independent cart line/hashId (registerApiProductVariant),
// so picking "1 - 5 Yrs" and "5 - 10 Yrs" for the same product are two separate cart entries, not
// one - no separate local "variantCart" bookkeeping needed, this reads/writes the same real
// AppStateContext cart every other Add/Inc/Dec in the app already uses.
export function VariantSheet({ visible, product, onClose }: VariantSheetProps) {
  const insets = useSafeAreaInsets();
  const { cart, loggedIn } = useAppState();
  const { addApiProduct, incApiProduct, decApiProduct } = useApiCartActions();

  const rows = useMemo(() => {
    if (!product?.realVariants) return [];
    return product.realVariants.map((v) => {
      const id = hashProductId(v.id);
      registerApiProductVariant(id, v.id);
      const rowProduct: Product = {
        id,
        name: product.name,
        brand: product.brand,
        cs: v.title,
        price: v.price,
        cmp: v.cmp,
        tint: product.tint,
        cat: product.cat,
        thumbnail: product.thumbnail,
        medusaId: product.medusaId,
        handle: product.handle,
        inStock: v.inStock,
      };
      return decorateProduct(rowProduct, cart[id] ?? 0, loggedIn);
    });
  }, [product, cart, loggedIn]);

  if (!product) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grabberRow}>
          <View style={styles.grabber} />
        </View>

        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={dsType.h2} numberOfLines={1}>{product.name}</Text>
            <Text style={styles.subtitle}>Select an option</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
            <CloseIcon size={14} color={ds.ink} strokeWidth={2.2} />
          </Pressable>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={[styles.bodyContent, { paddingBottom: dsSpacing.lg + insets.bottom }]}>
          <View style={styles.packsCard}>
            {rows.map((row, i) => {
              const outOfStock = row.inStock === false;
              const hasDiscount = !!row.cmp && row.cmp > row.price;
              return (
                <View key={row.id} style={[styles.packRow, i === rows.length - 1 && styles.packRowLast]}>
                  <View style={styles.packInfo}>
                    <Text style={styles.packLabel} numberOfLines={1}>{row.cs}</Text>
                    <View style={styles.priceRow}>
                      {hasDiscount ? (
                        <>
                          <Text style={styles.priceGreen}>{row.priceLabel}</Text>
                          <Text style={styles.mrpText}>{row.compareLabel}</Text>
                        </>
                      ) : (
                        <Text style={styles.priceDark}>{row.priceLabel}</Text>
                      )}
                    </View>
                  </View>

                  {outOfStock ? (
                    <View style={styles.outOfStockButton}>
                      <Text style={styles.outOfStockButtonText}>Out of stock</Text>
                    </View>
                  ) : row.cartQty > 0 ? (
                    <View style={styles.stepper}>
                      <Pressable onPress={() => decApiProduct(row)} style={styles.stepperBtn} hitSlop={4}>
                        {row.cartQty <= 1 ? <TrashIcon size={14} color={ds.dangerInk} /> : <Text style={styles.stepperGlyph}>−</Text>}
                      </Pressable>
                      <Text style={styles.stepperQty}>{row.cartQty}</Text>
                      <Pressable onPress={() => incApiProduct(row)} style={styles.stepperBtn} hitSlop={4}>
                        <Text style={styles.stepperGlyph}>+</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable onPress={() => addApiProduct(row)} style={styles.addButton}>
                      <CartIcon size={14} color={ds.surface} />
                      <Text style={styles.addButtonText}>Add</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(12,71,51,.45)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '84%',
    backgroundColor: ds.canvas,
    borderTopLeftRadius: dsRadii.sheet,
    borderTopRightRadius: dsRadii.sheet,
    overflow: 'hidden',
  },
  grabberRow: {
    flexShrink: 0,
    alignItems: 'center',
    paddingTop: dsSpacing.sm,
    backgroundColor: ds.surface,
  },
  grabber: { width: 36, height: 4, borderRadius: dsRadii.pill, backgroundColor: ds.lineStrong },
  header: {
    flexShrink: 0,
    backgroundColor: ds.surface,
    paddingHorizontal: dsSpacing.lg,
    paddingTop: dsSpacing.sm,
    paddingBottom: dsSpacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: dsSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ds.line,
  },
  headerText: { flex: 1, minWidth: 0 },
  subtitle: { ...dsType.meta, marginTop: 4 },
  closeButton: {
    flexShrink: 0,
    width: 32,
    height: 32,
    borderRadius: dsRadii.button,
    backgroundColor: ds.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: dsSpacing.lg, paddingTop: dsSpacing.md },
  packsCard: {
    backgroundColor: ds.surface,
    borderWidth: 1,
    borderColor: ds.line,
    borderRadius: dsRadii.button,
    overflow: 'hidden',
    ...dsElevation.e1,
  },
  packRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dsSpacing.md,
    padding: dsSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ds.line,
  },
  packRowLast: { borderBottomWidth: 0 },
  packInfo: { flex: 1, minWidth: 0 },
  packLabel: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: dsSpacing.sm },
  priceGreen: { fontFamily: dsFontFamily[700], fontSize: 14, lineHeight: 20, color: ds.primaryInk, fontVariant: ['tabular-nums'] },
  priceDark: { fontFamily: dsFontFamily[700], fontSize: 14, lineHeight: 20, color: ds.ink, fontVariant: ['tabular-nums'] },
  mrpText: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink3, textDecorationLine: 'line-through', fontVariant: ['tabular-nums'] },
  stepper: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: dsRadii.button,
    backgroundColor: ds.primarySoft,
  },
  stepperBtn: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepperGlyph: { fontFamily: dsFontFamily[700], fontSize: 18, lineHeight: 24, color: ds.primaryInk },
  stepperQty: { minWidth: 24, textAlign: 'center', fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.primaryInk, fontVariant: ['tabular-nums'] },
  addButton: {
    flexShrink: 0,
    height: 40,
    paddingHorizontal: dsSpacing.md,
    borderRadius: dsRadii.button,
    backgroundColor: ds.primaryStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: dsSpacing.sm,
  },
  addButtonText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.surface },
  outOfStockButton: {
    flexShrink: 0,
    height: 40,
    paddingHorizontal: dsSpacing.md,
    borderRadius: dsRadii.button,
    borderWidth: 1,
    borderColor: ds.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfStockButtonText: { fontFamily: dsFontFamily[600], fontSize: 13, lineHeight: 18, color: ds.ink3 },
});
