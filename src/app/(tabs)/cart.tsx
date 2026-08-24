import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ds, dsFontFamily, dsRadii, dsSpacing, dsElevation } from '@/theme';
import { ArrowRightIcon, SmallBackChevronIcon } from '@/icons';
import { CartLineCard } from '@/components/composite/CartLineCard';
import { useAppState } from '@/state/AppStateContext';

// Rebuilt against the new AyurvedaOne design system (screen_Cart.html, isCart block). `goHome` is
// still the header's only back handler (source never routes Cart's back button anywhere else).
// New this round: a visible "Volume discount" summary row (`hasVolumeDiscount`/`volumeDiscount`,
// now surfaced by computeCartTotals) — the old design folded this silently into the total with no
// line item; the new source shows it explicitly whenever the tiered discount actually applies.
export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { inc, dec, removeFromCart, cartTotals } = useAppState();
  const {
    cartLines,
    cartEmpty,
    cartHasItems,
    cartCount,
    subtotal,
    taxAmount,
    total,
    mrpTotal,
    cartHasDiscount,
    savePercent,
    volumeDiscount,
    hasVolumeDiscount,
  } = cartTotals;

  const goHome = () => router.push('/');
  const goCheckout = () => router.push('/checkout');

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
        {cartEmpty && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>No cases yet</Text>
            <Text style={styles.emptySubtitle}>Reorder your usuals in two taps.</Text>
            <Pressable onPress={goHome} style={styles.browseButton}>
              <Text style={styles.browseButtonText}>Browse catalogue</Text>
            </Pressable>
          </View>
        )}

        {cartLines.length > 0 && (
          <View style={styles.lines}>
            {cartLines.map((line) => (
              <CartLineCard key={line.id} line={line} onInc={() => inc(line.id)} onDec={() => dec(line.id)} onRemove={() => removeFromCart(line.id)} />
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
                  <Text style={styles.summaryValue}>{subtotal}</Text>
                </View>
                {hasVolumeDiscount && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Volume discount</Text>
                    <Text style={styles.summaryValueAccent}>−{volumeDiscount}</Text>
                  </View>
                )}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tax</Text>
                  <Text style={styles.summaryValue}>{taxAmount}</Text>
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
                  {cartHasDiscount && <Text style={styles.mrpStrike}>{mrpTotal}</Text>}
                  <Text style={styles.totalValue}>{total}</Text>
                  {cartHasDiscount && (
                    <View style={styles.savePill}>
                      <Text style={styles.savePillText}>{savePercent} off</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {cartHasItems && (
        <View style={[styles.footer, { paddingBottom: dsSpacing.md + insets.bottom }]}>
          <View style={styles.footerInfo}>
            <Text style={styles.footerCount} numberOfLines={1}>{cartCount} items</Text>
            <Text style={styles.footerTotal} numberOfLines={1}>{total}</Text>
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
  summaryValueAccent: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.accent },
  shippingChip: { backgroundColor: ds.primarySoft, borderRadius: dsRadii.chip, paddingHorizontal: dsSpacing.sm, paddingVertical: 4 },
  shippingChipText: { fontFamily: dsFontFamily[600], fontSize: 11, lineHeight: 14, letterSpacing: 0.22, color: ds.primaryInk },
  divider: { height: 1, backgroundColor: ds.line, marginVertical: dsSpacing.md },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { fontFamily: dsFontFamily[700], fontSize: 18, lineHeight: 24, letterSpacing: -0.18, color: ds.ink },
  totalRight: { alignItems: 'flex-end' },
  mrpStrike: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink3, textDecorationLine: 'line-through' },
  totalValue: { fontFamily: dsFontFamily[700], fontSize: 18, lineHeight: 24, color: ds.primaryInk },
  savePill: { marginLeft: 4, backgroundColor: ds.primarySoft, borderRadius: dsRadii.chip, paddingHorizontal: 4, paddingVertical: 2 },
  savePillText: { fontFamily: dsFontFamily[600], fontSize: 11, lineHeight: 14, letterSpacing: 0.22, color: ds.primaryInk },
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
