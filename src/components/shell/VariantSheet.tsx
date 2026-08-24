import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ds, dsElevation, dsFontFamily, dsRadii, dsSpacing, dsType } from '@/theme';
import { CartIcon, CloseIcon, TrashIcon } from '@/icons';
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

// Ported verbatim from the new AyurvedaOne design system source's `variantPacks` (Various Mobile App -
// Phone.dc.html, lines 2927-2939): 3 fixed packs per product — standard (×1, at the product's own
// price/cmp), "Bulk carton × 6" (×6 the unit price with the same BULK=0.94 volume discount applied
// storewide, priced against 6× the product's own MRP — genuinely discounted, unlike this file's
// pre-redesign version which priced the bulk pack's "MRP" as 6× its own price so it could never show a
// discount chip), and "Trial pack" (×0.4, discount derived from the product's own MRP). Margin uses the
// exact same `marginOf(p)` formula as everywhere else in the new design (base, +3 for bulk, -5 for
// trial) instead of hardcoded per-pack percentages. `label` is the bare pack description with no
// product-name prefix — the sheet's header already shows the product name once. `base`/`mrp` fall back
// to 12 / base*1.18 if the product has neither price nor cmp, matching the source exactly (never
// happens with the current seed catalog, kept for parity).
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
  variantCart: Record<string, number>;
  onClose: () => void;
  onAdd: (pack: VariantPack) => void;
  onInc: (pack: VariantPack) => void;
  onDec: (pack: VariantPack) => void;
  onGoCart: () => void;
}

// Rebuilt against the new AyurvedaOne design system (Various Mobile App - Phone.dc.html, the
// `variantOpen` block, source lines 2221-2280) — the same bottom-sheet chrome pattern as
// `FilterSheet.tsx` (grabber, `canvas` body, `surface` header, `e3`-equivalent shadow via
// `border-radius:16px 16px 0 0`). Each pack renders as a row inside one bordered `e1` card, not
// separate cards per pack. Note the source's own quirk, replicated as-is: the per-pack stepper tracks
// its own small counter (`variantCart[key]`), but tapping +/-/Add ALSO nudges the MAIN product's cart
// quantity by the pack's `mult` (so the "Bulk carton × 6" pack adds 6 to the main product's cart count
// per tap, and "Trial pack" adds 0.4) — two independent numbers, not one. `onGoCart` is accepted for
// prop-contract parity with the pre-redesign version but the new source's row markup has no
// go-to-cart icon button (same removal already made to the Listing screen's cart row in an earlier
// round) — kept as an unused prop rather than touching `categories.tsx`'s call site this round.
export function VariantSheet({ visible, product, variantCart, onClose, onAdd, onInc, onDec }: VariantSheetProps) {
  const insets = useSafeAreaInsets();
  if (!product) return null;
  const packs = buildVariantPacks(product);

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
            <Text style={styles.subtitle}>Select a pack size</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
            <CloseIcon size={14} color={ds.ink} strokeWidth={2.2} />
          </Pressable>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={[styles.bodyContent, { paddingBottom: dsSpacing.lg + insets.bottom }]}>
          <View style={styles.packsCard}>
            {packs.map((pack, i) => {
              const qty = variantCart[pack.key] || 0;
              const inCart = qty > 0;
              const hasDiscount = pack.mrpBase > pack.price;
              return (
                <View key={pack.key} style={[styles.packRow, i === packs.length - 1 && styles.packRowLast]}>
                  <View style={styles.packInfo}>
                    <Text style={styles.packLabel} numberOfLines={1}>{pack.label}</Text>
                    <View style={styles.priceRow}>
                      {hasDiscount ? (
                        <>
                          <Text style={styles.priceGreen}>{money(pack.price)}</Text>
                          <Text style={styles.mrpText}>{money(pack.mrpBase)}</Text>
                        </>
                      ) : (
                        <Text style={styles.priceDark}>{money(pack.price)}</Text>
                      )}
                    </View>
                    <View style={styles.marginChip}>
                      <Text style={styles.marginText}>{pack.margin} margin</Text>
                    </View>
                  </View>

                  {inCart ? (
                    <View style={styles.stepper}>
                      <Pressable onPress={() => onDec(pack)} style={styles.stepperBtn} hitSlop={4}>
                        {qty <= 1 ? <TrashIcon size={14} color={ds.dangerInk} /> : <Text style={styles.stepperGlyph}>−</Text>}
                      </Pressable>
                      <Text style={styles.stepperQty}>{qty}</Text>
                      <Pressable onPress={() => onInc(pack)} style={styles.stepperBtn} hitSlop={4}>
                        <Text style={styles.stepperGlyph}>+</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable onPress={() => onAdd(pack)} style={styles.addButton}>
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
  marginChip: {
    alignSelf: 'flex-start',
    marginTop: dsSpacing.sm,
    backgroundColor: ds.primarySoft,
    borderRadius: dsRadii.chip,
    paddingHorizontal: dsSpacing.sm,
    paddingVertical: 4,
  },
  marginText: { fontFamily: dsFontFamily[600], fontSize: 11, lineHeight: 14, letterSpacing: 0.22, color: ds.primaryInk },
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
});
