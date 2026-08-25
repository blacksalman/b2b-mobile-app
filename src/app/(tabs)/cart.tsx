import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ds, dsFontFamily, dsRadii, dsSpacing, dsElevation } from '@/theme';
import { ArrowRightIcon, SmallBackChevronIcon } from '@/icons';
import { CartLineCard } from '@/components/composite/CartLineCard';
import { useRealCart, type RealCartLine } from '@/data/cartApi';
import type { CartLine } from '@/data/cartTotals';
import { useAppState } from '@/state/AppStateContext';
import { hashProductId } from '@/data/idHash';

// Adapts a real cart line into the same CartLine shape CartLineCard already renders (shared with
// MiniCartSheet, left untouched) - no new fields/UI added to that component beyond the optional
// `thumbnail` it already gained. `tint` is just the neutral backdrop behind the real photo now.
function toCartLine(line: RealCartLine): CartLine {
  return {
    id: hashProductId(line.productId),
    tint: ds.primarySoft,
    name: line.name,
    brandUpper: line.brand.toUpperCase(),
    caseLabel: line.cs,
    qty: line.qty,
    total: line.lineTotalLabel,
    mrpTotal: line.lineMrpTotalLabel ?? line.lineTotalLabel,
    priceEach: line.unitPriceLabel,
    mrpEach: line.unitMrpLabel ?? line.unitPriceLabel,
    hasOffer: line.hasDiscount,
    noOffer: !line.hasDiscount,
    discount: line.discountLabel ?? '',
    thumbnail: line.thumbnail,
  };
}

// Rebuilt against the new AyurvedaOne design system (screen_Cart.html, isCart block). `goHome` is
// still the header's only back handler (source never routes Cart's back button anywhere else).
// Backed by the real Medusa cart now (useRealCart, cartApi.ts) instead of the old local
// computeCartTotals - real images/MRP/discount%, and the old "Volume discount" row is gone
// entirely (it was a fabricated 10%/20%-off-arbitrary-subtotal-thresholds rule with no real
// backend promotion behind it, not something to keep showing a made-up number for).
export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { inc, dec, removeFromCart } = useAppState();
  const {
    loading,
    lines,
    cartEmpty,
    cartHasItems,
    itemCount,
    subtotalLabel,
    taxLabel,
    totalLabel,
    hasDiscount,
    mrpTotalLabel,
    updateQuantity,
  } = useRealCart();

  const goHome = () => router.push('/');
  const goCheckout = () => router.push('/checkout');

  // Real cart mutations (line-item id) drive the actual server-side cart; the local numeric
  // cart (AppStateContext) is only nudged alongside purely to keep the header's mini-cart FAB
  // badge count in sync elsewhere in the app - same hashProductId(product_id) convention
  // hydrateCartState already uses to rebuild that local state from a real cart on app boot.
  const lineInc = (line: RealCartLine) => {
    updateQuantity(line.id, line.qty + 1);
    inc(hashProductId(line.productId));
  };
  const lineDec = (line: RealCartLine) => {
    updateQuantity(line.id, Math.max(0, line.qty - 1));
    dec(hashProductId(line.productId));
  };
  const lineRemove = (line: RealCartLine) => {
    updateQuantity(line.id, 0);
    removeFromCart(hashProductId(line.productId));
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + dsSpacing.md }]}>
        <Pressable onPress={goHome} style={styles.backButton} hitSlop={4}>
          <SmallBackChevronIcon size={9} color={ds.ink} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Cart</Text>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={[styles.bodyContent, !cartHasItems && { paddingBottom: insets.bottom + dsSpacing.xl }]}
      >
        {!loading && cartEmpty && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>No cases yet</Text>
            <Text style={styles.emptySubtitle}>Reorder your usuals in two taps.</Text>
            <Pressable onPress={goHome} style={styles.browseButton}>
              <Text style={styles.browseButtonText}>Browse catalogue</Text>
            </Pressable>
          </View>
        )}

        {lines.length > 0 && (
          <View style={styles.lines}>
            {lines.map((line) => (
              <CartLineCard key={line.id} line={toCartLine(line)} onInc={() => lineInc(line)} onDec={() => lineDec(line)} onRemove={() => lineRemove(line)} />
            ))}
          </View>
        )}

        {cartHasItems && (
          <View style={styles.summaryWrap}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Order summary</Text>
              <View style={styles.summaryRows}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>{subtotalLabel}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tax</Text>
                  <Text style={styles.summaryValue}>{taxLabel}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Shipping</Text>
                  <View style={styles.shippingChip}>
                    <Text style={styles.shippingChipText}>Calculated at checkout</Text>
                  </View>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <View style={styles.totalRight}>
                  {hasDiscount && <Text style={styles.mrpStrike}>{mrpTotalLabel}</Text>}
                  <Text style={styles.totalValue}>{totalLabel}</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {cartHasItems && (
        <View style={[styles.footer, { paddingBottom: dsSpacing.md + insets.bottom }]}>
          <View style={styles.footerInfo}>
            <Text style={styles.footerCount} numberOfLines={1}>{itemCount} items</Text>
            <Text style={styles.footerTotal} numberOfLines={1}>{totalLabel}</Text>
          </View>
          <Pressable onPress={goCheckout} style={styles.checkoutButton}>
            <Text style={styles.checkoutButtonText}>Checkout</Text>
            <ArrowRightIcon size={14} color={ds.surface} strokeWidth={2.2} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ds.canvas },
  header: {
    flexShrink: 0,
    backgroundColor: ds.surface,
    borderBottomWidth: 1,
    borderBottomColor: ds.line,
    paddingHorizontal: dsSpacing.lg,
    paddingBottom: dsSpacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: dsSpacing.md,
  },
  backButton: { flexShrink: 0, width: 32, height: 32, borderRadius: dsRadii.button, backgroundColor: ds.canvas, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, minWidth: 0, fontFamily: dsFontFamily[700], fontSize: 18, lineHeight: 24, letterSpacing: -0.18, color: ds.ink },
  body: { flex: 1 },
  bodyContent: {},
  emptyState: { padding: dsSpacing.lg, alignItems: 'center' },
  emptyIcon: { width: 64, height: 64, borderRadius: dsRadii.sheet, backgroundColor: ds.primarySoft, marginTop: dsSpacing.xl },
  emptyTitle: { fontFamily: dsFontFamily[600], fontSize: 16, lineHeight: 22, letterSpacing: -0.16, color: ds.ink, marginTop: dsSpacing.md, textAlign: 'center' },
  emptySubtitle: { fontFamily: dsFontFamily[400], fontSize: 14, lineHeight: 21, color: ds.ink2, marginTop: 4, textAlign: 'center' },
  browseButton: { marginTop: dsSpacing.md, height: 40, borderRadius: dsRadii.button, backgroundColor: ds.primaryStrong, alignItems: 'center', justifyContent: 'center', paddingHorizontal: dsSpacing.lg },
  browseButtonText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.surface },
  lines: { paddingHorizontal: dsSpacing.lg, paddingTop: dsSpacing.lg, gap: dsSpacing.md },
  summaryWrap: { paddingVertical: dsSpacing.xl, paddingHorizontal: dsSpacing.lg },
  summaryCard: { backgroundColor: ds.surface, borderWidth: 1, borderColor: ds.line, borderRadius: dsRadii.button, padding: dsSpacing.md, ...dsElevation.e1 },
  summaryTitle: { fontFamily: dsFontFamily[700], fontSize: 16, lineHeight: 22, letterSpacing: -0.16, color: ds.ink },
  summaryRows: { marginTop: dsSpacing.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: dsSpacing.sm },
  summaryLabel: { fontFamily: dsFontFamily[400], fontSize: 14, lineHeight: 21, color: ds.ink2 },
  summaryValue: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink },
  shippingChip: { backgroundColor: ds.primarySoft, borderRadius: dsRadii.chip, paddingHorizontal: dsSpacing.sm, paddingVertical: 4 },
  shippingChipText: { fontFamily: dsFontFamily[600], fontSize: 11, lineHeight: 14, letterSpacing: 0.22, color: ds.primaryInk },
  divider: { height: 1, backgroundColor: ds.line, marginVertical: dsSpacing.md },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { fontFamily: dsFontFamily[700], fontSize: 18, lineHeight: 24, letterSpacing: -0.18, color: ds.ink },
  totalRight: { alignItems: 'flex-end' },
  mrpStrike: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink3, textDecorationLine: 'line-through' },
  totalValue: { fontFamily: dsFontFamily[700], fontSize: 18, lineHeight: 24, color: ds.primaryInk },
  footer: {
    flexShrink: 0,
    backgroundColor: ds.surface,
    borderTopWidth: 1,
    borderTopColor: ds.line,
    paddingHorizontal: dsSpacing.lg,
    paddingTop: dsSpacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: dsSpacing.md,
    ...dsElevation.e2,
  },
  footerInfo: { minWidth: 0 },
  footerCount: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink2 },
  footerTotal: { fontFamily: dsFontFamily[700], fontSize: 18, lineHeight: 24, letterSpacing: -0.18, color: ds.primaryInk },
  checkoutButton: {
    flexShrink: 0,
    height: 40,
    borderRadius: dsRadii.button,
    backgroundColor: ds.primaryStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: dsSpacing.sm,
    paddingHorizontal: dsSpacing.lg,
  },
  checkoutButtonText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.surface },
});
