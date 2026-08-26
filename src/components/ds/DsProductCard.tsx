import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { ds, dsFontFamily, dsRadii, dsElevation } from '@/theme';
import type { RailProduct } from '@/data/home-content';
import { CartIcon, TrashIcon } from '@/icons';

interface DsProductCardProps {
  product: RailProduct & { hasOffer?: boolean; noOffer?: boolean };
  width?: number | `${number}%`; // fixed width for rail cards; '48%' for a 2-col grid; omitted = flex:1
  onOpen: () => void;
  onAdd: () => void;
  onInc: () => void;
  onDec: () => void;
  onLogin: () => void;
  // A real product with more than one Medusa variant (product.realVariants, homeApi.ts) shows an
  // outlined "Select option" button instead of the normal stepper/Add - there's no single "the"
  // price/variant to add until the customer picks one. Defaults to `onOpen` when omitted (every
  // call site that doesn't explicitly want different behavior) - the product detail page is
  // where the actual real variant picker lives (see product/[id].tsx), so "select" and "view
  // details" land on the same place.
  onSelectOption?: () => void;
}

// Rebuilt against the new AyurvedaOne design system's product card (repeated verbatim across every
// rail/grid in Various Mobile App - Phone.dc.html — buyAgain/featured/bestSellers/newArrivals/
// concerns/search-results all share this exact markup). Distinct from the old `ProductCard.tsx`
// (still used by Listing, not yet wired to real data): the new card drops the old design's
// top-left "times ordered"/rank/"New" badge overlays entirely (not present anywhere in the new
// markup) and shows a discount chip instead - the real per-unit discount % (p.discount), not a
// fabricated margin number. `noOffer` (Featured rail only) hides the struck compare-at price —
// every other rail always shows it when a real discount is active.
export const DsProductCard = React.memo(function DsProductCard({ product: p, width, onOpen, onAdd, onInc, onDec, onLogin, onSelectOption }: DsProductCardProps) {
  // A real discount/MRP is only genuine when the product actually has one (p.cmp set) - decorateProduct
  // falls back to a fabricated compareLabel (price*1.18) when it isn't, purely so mock-catalog screens
  // that expect every card to show *some* struck price keep working; real API products correctly leave
  // cmp unset when there's no real discount (see toRailProduct in homeApi.ts), so gate display on that
  // instead of trusting compareLabel/margin to always be meaningful.
  const hasDiscount = !p.noOffer && !!p.cmp;
  // p.inStock is only ever explicitly false for a real out-of-stock product (homeApi.ts's
  // toProduct) - undefined (mock catalog, no real inventory concept) stays treated as in-stock,
  // same as everywhere else in this app that reads real-API-only fields.
  const outOfStock = p.inStock === false;
  const hasVariants = (p.realVariants?.length ?? 0) > 1;

  return (
    <View style={[styles.card, width ? { width } : styles.flexCard]}>
      <Pressable onPress={onOpen} style={styles.imageWrap}>
        {p.thumbnail ? (
          // contain, not cover: a cropped product photo (bottle top/label cut off) reads as
          // broken - showing the whole product on its tinted background matches every other
          // real e-commerce listing and is what "contain" is for.
          <Image source={{ uri: p.thumbnail }} style={[styles.image, outOfStock && styles.imageOutOfStock]} contentFit="contain" />
        ) : null}
        {/* p.margin was a fabricated per-product placeholder %, unrelated to the real discount
            - replaced with the actual discount (p.discount, e.g. "-5%"), same value/format the
            old ProductCard.tsx's discount chip already used elsewhere in this app. */}
        {hasDiscount && !outOfStock && <Text style={styles.discountChip}>{p.discount}</Text>}
        {outOfStock && <Text style={styles.outOfStockChip}>Out of stock</Text>}
      </Pressable>
      <View style={styles.body}>
        <Pressable onPress={onOpen}>
          <Text style={styles.name} numberOfLines={2}>{p.name}</Text>
        </Pressable>
        <Text style={styles.brand} numberOfLines={1}>{p.brand}</Text>
        {/* A real product with zero real reviews yet (reviewsApi.ts) shows an honest "0.0 (0)"
            on the product detail page, but on the card itself that reads as a bad/unrated product
            rather than "no reviews yet" - hidden here instead, same as most real storefronts only
            show a rating badge once one actually exists. Mock-catalog products (still used by a
            couple of legacy rails) keep their always-positive placeholder count unaffected. */}
        {!!p.reviewCount && (
          <View style={styles.ratingRow}>
            <Text style={styles.star}>★</Text>
            <Text style={styles.ratingValue}>{p.rating}</Text>
            <Text style={styles.reviewCount}>({p.reviewCount})</Text>
          </View>
        )}
        {p.showPrice && (
          <View style={styles.priceBlock}>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{p.priceLabel}</Text>
              {hasDiscount && <Text style={styles.compare}>{p.compareLabel}</Text>}
            </View>
            {outOfStock ? (
              <View style={styles.outOfStockButton}>
                <Text style={styles.outOfStockButtonText}>Out of stock</Text>
              </View>
            ) : hasVariants ? (
              <Pressable onPress={onSelectOption ?? onOpen} style={styles.selectOptionButton}>
                <Text style={styles.selectOptionText}>Select option</Text>
              </Pressable>
            ) : p.inCart ? (
              <View style={styles.stepper}>
                <Pressable onPress={onDec} style={styles.stepperBtn} hitSlop={4}>
                  {p.cartQty <= 1 ? <TrashIcon size={14} color={ds.dangerInk} /> : <Text style={styles.stepperGlyph}>−</Text>}
                </Pressable>
                <Text style={styles.stepperQty}>{p.cartQty}</Text>
                <Pressable onPress={onInc} style={styles.stepperBtn} hitSlop={4}>
                  <Text style={styles.stepperGlyph}>+</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={onAdd} style={styles.addButton}>
                <CartIcon size={14} color={ds.surface} />
                <Text style={styles.addButtonText}>Add</Text>
              </Pressable>
            )}
          </View>
        )}
        {p.gated && (
          <Pressable onPress={onLogin} style={styles.gatedButton}>
            <Text style={styles.gatedButtonText}>Log in for price</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    flexShrink: 0,
    backgroundColor: ds.surface,
    borderWidth: 1,
    borderColor: ds.line,
    borderRadius: dsRadii.button,
    overflow: 'hidden',
    ...dsElevation.e1,
  },
  flexCard: { flex: 1, minWidth: 0 },
  imageWrap: {
    aspectRatio: 4 / 3,
    backgroundColor: ds.primarySoft,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOutOfStock: { opacity: 0.45 },
  outOfStockChip: {
    position: 'absolute',
    top: 8,
    left: 8,
    fontFamily: dsFontFamily[600],
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    backgroundColor: ds.surface,
    color: ds.dangerInk,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: dsRadii.chip,
    overflow: 'hidden',
  },
  discountChip: {
    position: 'absolute',
    top: 8,
    left: 8,
    fontFamily: dsFontFamily[600],
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
    backgroundColor: ds.surface,
    color: ds.primaryInk,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: dsRadii.chip,
    overflow: 'hidden',
  },
  body: { padding: 12, flex: 1 },
  name: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink },
  brand: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink2, marginTop: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  star: { fontFamily: dsFontFamily[400], fontSize: 14, lineHeight: 21, color: ds.star },
  ratingValue: { fontFamily: dsFontFamily[600], fontSize: 11, lineHeight: 14, letterSpacing: 0.22, color: ds.ink },
  reviewCount: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink3 },
  priceBlock: { marginTop: 'auto', paddingTop: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  price: { fontFamily: dsFontFamily[700], fontSize: 14, lineHeight: 20, color: ds.primaryInk },
  compare: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink3, textDecorationLine: 'line-through' },
  stepper: {
    marginTop: 12,
    height: 40,
    borderRadius: dsRadii.button,
    backgroundColor: ds.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  stepperBtn: { width: 34, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepperGlyph: { fontFamily: dsFontFamily[700], fontSize: 18, lineHeight: 24, color: ds.primaryInk },
  stepperQty: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.primaryInk },
  addButton: {
    marginTop: 12,
    height: 40,
    borderRadius: dsRadii.button,
    backgroundColor: ds.primaryStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.surface },
  outOfStockButton: {
    marginTop: 12,
    height: 40,
    borderRadius: dsRadii.button,
    backgroundColor: ds.canvas,
    borderWidth: 1,
    borderColor: ds.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfStockButtonText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink3 },
  selectOptionButton: {
    marginTop: 12,
    height: 40,
    borderRadius: dsRadii.button,
    borderWidth: 1.5,
    borderColor: ds.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectOptionText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.primaryInk },
  gatedButton: {
    marginTop: 12,
    height: 40,
    borderRadius: dsRadii.button,
    borderWidth: 1.5,
    borderColor: ds.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gatedButtonText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.primaryInk },
});
