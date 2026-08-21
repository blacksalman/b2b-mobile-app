import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamily } from '@/theme';
import { ArrowRightIcon, LocationPinIcon, ReceiptIcon, ShippingBoxIcon, SmallBackChevronIcon } from '@/icons';
import { deliveryAddress } from '@/data/cartTotals';
import { useAppState } from '@/state/AppStateContext';

// Ported verbatim from the source's `isCheckout` (line 1337). The entire old 3-step stepper/day-slot
// picker/payment-method flow is gone — replaced by this single scrolling screen. `placeOrder` is
// UNCHANGED and still fully decorative: it just jumps to the existing tracking screen, no real
// payment processing, per the "same exact design" rule.
export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cartTotals } = useAppState();
  const { cartLines, subtotal, taxAmount, shippingFee, payTotal } = cartTotals;

  const goCart = () => router.push('/cart');
  const placeOrder = () => router.push('/tracking');

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={goCart} style={styles.backButton}>
            <SmallBackChevronIcon size={9} />
          </Pressable>
          <Text style={styles.headerTitle}>Checkout</Text>
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <LocationPinIcon size={16} />
            <Text style={styles.sectionLabel}>Delivery Address</Text>
          </View>
          {/* Ported verbatim: the source's "Change" link has no onClick handler at all — styled text
              only. Do not wire a real address-change flow. */}
          <Text style={styles.changeLink}>Change</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.addressName}>{deliveryAddress.name}</Text>
          <Text style={styles.addressLines}>
            {deliveryAddress.city}
            {'\n'}
            {deliveryAddress.line}
            {'\n'}Phone: {deliveryAddress.phone}
          </Text>
        </View>

        <View style={styles.sectionHeaderPlain}>
          <ShippingBoxIcon size={16} />
          <Text style={styles.sectionLabel}>Shipping</Text>
        </View>
        <View style={[styles.card, styles.rowCard]}>
          <Text style={styles.rowLabel}>Express Shipping</Text>
          <Text style={styles.rowValue}>{shippingFee}</Text>
        </View>

        <View style={styles.sectionHeaderPlain}>
          <ReceiptIcon size={16} />
          <Text style={styles.sectionLabel}>Order Summary</Text>
        </View>
        <View style={styles.card}>
          {cartLines.map((line) => (
            <View key={line.id} style={styles.lineRow}>
              <Text style={styles.lineName} numberOfLines={1}>
                ({line.qty}) x {line.name}
              </Text>
              {line.hasOffer ? (
                <View style={styles.lineAmounts}>
                  <Text style={styles.lineMrp}>{line.mrpTotal}</Text>
                  <Text style={styles.linePriceGreen}>{line.total}</Text>
                </View>
              ) : (
                <Text style={styles.linePriceDark}>{line.total}</Text>
              )}
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{subtotal}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={styles.summaryValue}>{shippingFee}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>GST</Text>
            <Text style={styles.summaryValue}>{taxAmount}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>{payTotal}</Text>
          </View>
        </View>

        <View style={styles.policiesCard}>
          <Text style={styles.policiesTitle}>Policies</Text>
          <Text style={styles.policyHeading}>Return / Refund / Cancellation</Text>
          <Text style={styles.policyBody}>
            Eligible returns are accepted within 10 days of delivery for unused, unopened products in original packaging. Orders may be cancelled before dispatch, and
            approved refunds or replacements are processed after inspection… <Text style={styles.policyLink}>learn more</Text>
          </Text>
          <View style={styles.divider} />
          <Text style={styles.policyHeading}>Shipping / Delivery</Text>
          <Text style={styles.policyBody}>
            Orders are generally delivered within 2–3 business days, with shipping charges shown at checkout. Free delivery may apply on eligible orders above ₹1,000,
            while liquid products or remote locations may take longer… <Text style={styles.policyLink}>learn more</Text>
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
        <View>
          <Text style={styles.footerLabel}>To Pay</Text>
          <Text style={styles.footerTotal}>{payTotal}</Text>
        </View>
        <Pressable onPress={placeOrder} style={styles.payButton}>
          <Text style={styles.payButtonText}>Proceed with Payment</Text>
          <ArrowRightIcon size={13} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cardBg },
  scrollContent: { paddingHorizontal: 14, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fontFamily[700], fontSize: 20, color: colors.charcoal },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionHeaderPlain: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 22 },
  sectionLabel: { fontFamily: fontFamily[700], fontSize: 15, color: colors.charcoal },
  changeLink: { fontFamily: fontFamily[600], fontSize: 12.5, color: colors.brandGreen },
  card: { marginTop: 9, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderGray, borderRadius: 16, padding: 14 },
  rowCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { fontFamily: fontFamily[400], fontSize: 13, color: colors.charcoal },
  rowValue: { fontFamily: fontFamily[700], fontSize: 14, color: colors.charcoal },
  addressName: { fontFamily: fontFamily[700], fontSize: 14, color: colors.charcoal },
  addressLines: { fontFamily: fontFamily[400], fontSize: 12.5, lineHeight: 20, color: colors.bodyGray, marginTop: 5 },
  lineRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, paddingVertical: 6 },
  lineName: { flex: 1, minWidth: 0, fontFamily: fontFamily[400], fontSize: 12.5, color: colors.charcoal },
  lineAmounts: { flexShrink: 0, flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  lineMrp: { fontFamily: fontFamily[400], fontSize: 11.5, color: '#9A9A98', textDecorationLine: 'line-through' },
  linePriceGreen: { fontFamily: fontFamily[600], fontSize: 12.5, color: colors.brandGreen },
  linePriceDark: { flexShrink: 0, fontFamily: fontFamily[400], fontSize: 12.5, color: colors.charcoal },
  divider: { height: 1, backgroundColor: colors.borderGray, marginVertical: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  summaryLabel: { fontFamily: fontFamily[400], fontSize: 12.5, color: colors.bodyGray },
  summaryValue: { fontFamily: fontFamily[600], fontSize: 12.5, color: colors.charcoal },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { fontFamily: fontFamily[700], fontSize: 15, color: colors.charcoal },
  totalValue: { fontFamily: fontFamily[700], fontSize: 18, color: colors.brandGreen },
  policiesCard: { marginTop: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderGray, borderRadius: 16, padding: 14 },
  policiesTitle: { fontFamily: fontFamily[700], fontSize: 14, color: colors.charcoal },
  policyHeading: { fontFamily: fontFamily[600], fontSize: 13, color: colors.charcoal, marginTop: 12 },
  policyBody: { fontFamily: fontFamily[400], fontSize: 12, lineHeight: 19, color: colors.bodyGray, marginTop: 4 },
  policyLink: { color: colors.brandGreen, textDecorationLine: 'underline' },
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
  footerTotal: { fontFamily: fontFamily[700], fontSize: 20, color: colors.brandGreen, letterSpacing: -0.2 },
  payButton: {
    flexShrink: 0,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.brandGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  payButtonText: { fontFamily: fontFamily[600], fontSize: 13.5, color: colors.white },
});
