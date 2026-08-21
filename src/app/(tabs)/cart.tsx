import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamily } from '@/theme';
import { ArrowRightIcon, SmallBackChevronIcon } from '@/icons';
import { CartLineCard } from '@/components/composite/CartLineCard';
import { useAppState } from '@/state/AppStateContext';

// Ported verbatim from the source's `isCart` (line 1238). `goHome` is the header's back handler
// (source never routes Cart's back button anywhere else, unlike Listing's real router.back()).
export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { inc, dec, removeFromCart, cartTotals } = useAppState();
  const { cartLines, cartEmpty, cartHasItems, subtotal, taxAmount, total, mrpTotal, cartHasDiscount, savePercent } = cartTotals;

  const goHome = () => router.push('/');
  const goCheckout = () => router.push('/checkout');

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={goHome} style={styles.backButton}>
            <SmallBackChevronIcon size={9} />
          </Pressable>
          <Text style={styles.headerTitle}>Cart</Text>
        </View>
        <View style={styles.headerDivider} />

        {cartEmpty && (
          <View style={styles.emptyState}>
            <View style={styles.emptyBox} />
            <Text style={styles.emptyTitle}>No cases yet</Text>
            <Text style={styles.emptySubtitle}>Reorder your usuals in two taps.</Text>
            <Pressable onPress={goHome} style={styles.browseButton}>
              <Text style={styles.browseButtonText}>Browse catalogue</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.lines}>
          {cartLines.map((line) => (
            <CartLineCard key={line.id} line={line} onInc={() => inc(line.id)} onDec={() => dec(line.id)} onRemove={() => removeFromCart(line.id)} />
          ))}
        </View>

        {cartHasItems && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Order Summary</Text>
            <View style={styles.summaryRows}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{subtotal}</Text>
              </View>
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
            <View style={styles.summaryDivider} />
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
        )}
      </ScrollView>

      {cartHasItems && (
        <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
          <View>
            <Text style={styles.footerLabel}>Total Amount</Text>
            <View style={styles.footerTotalRow}>
              <Text style={styles.footerTotal}>{total}</Text>
              {cartHasDiscount && <Text style={styles.footerMrp}>{mrpTotal}</Text>}
            </View>
          </View>
          <Pressable onPress={goCheckout} style={styles.checkoutButton}>
            <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
            <ArrowRightIcon size={14} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cardBg },
  scrollContent: { paddingHorizontal: 14, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fontFamily[700], fontSize: 22, color: colors.charcoal },
  headerDivider: { height: 1, backgroundColor: colors.borderGray, marginTop: 14 },
  emptyState: { marginTop: 40, alignItems: 'center' },
  emptyBox: { width: 70, height: 70, borderRadius: 22, backgroundColor: colors.white },
  emptyTitle: { fontFamily: fontFamily[600], fontSize: 14, color: colors.charcoal, marginTop: 14 },
  emptySubtitle: { fontFamily: fontFamily[400], fontSize: 11.5, color: colors.bodyGray, marginTop: 4 },
  browseButton: { marginTop: 16, backgroundColor: colors.brandGreen, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  browseButtonText: { fontFamily: fontFamily[600], fontSize: 12.5, color: colors.white },
  lines: { gap: 10, marginTop: 14 },
  summaryCard: { marginTop: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderGray, borderRadius: 18, padding: 18 },
  summaryTitle: { fontFamily: fontFamily[700], fontSize: 17, color: colors.charcoal },
  summaryRows: { marginTop: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  summaryLabel: { fontFamily: fontFamily[400], fontSize: 13, color: colors.bodyGray },
  summaryValue: { fontFamily: fontFamily[600], fontSize: 13, color: colors.charcoal },
  shippingChip: { backgroundColor: colors.mintTint, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  shippingChipText: { fontFamily: fontFamily[600], fontSize: 13, color: colors.brandGreen },
  summaryDivider: { height: 1, backgroundColor: colors.borderGray, marginVertical: 12 },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { fontFamily: fontFamily[700], fontSize: 15, color: colors.charcoal },
  totalRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mrpStrike: { fontFamily: fontFamily[400], fontSize: 12, color: '#9A9A98', textDecorationLine: 'line-through' },
  totalValue: { fontFamily: fontFamily[700], fontSize: 19, color: colors.brandGreen },
  savePill: { backgroundColor: colors.mintTint, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  savePillText: { fontFamily: fontFamily[600], fontSize: 10, color: colors.brandGreen },
  footer: {
    flexShrink: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  footerLabel: { fontFamily: fontFamily[400], fontSize: 11, color: colors.bodyGray },
  footerTotalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 3 },
  footerTotal: { fontFamily: fontFamily[700], fontSize: 20, color: colors.charcoal, letterSpacing: -0.2 },
  footerMrp: { fontFamily: fontFamily[400], fontSize: 12, color: '#9A9A98', textDecorationLine: 'line-through' },
  checkoutButton: {
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.brandGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  checkoutButtonText: { fontFamily: fontFamily[600], fontSize: 13, color: colors.white },
});
