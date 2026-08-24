import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ds, dsFontFamily, dsRadii, dsSpacing, dsType, dsElevation } from '@/theme';
import {
  AlertCircleIcon,
  ArrowRightIcon,
  ChevronRightIcon,
  CheckThinIcon,
  CloseIcon,
  LocationPinIcon,
  ProcessingSparkleIcon,
  ReturnPolicyIcon,
  ShippingBoxIcon,
  SmallBackChevronIcon,
} from '@/icons';
import { deliveryAddress } from '@/data/cartTotals';
import { useAppState } from '@/state/AppStateContext';

type PaymentStatus = 'processing' | 'success' | 'failed' | 'cancelled';

// Rebuilt against the new AyurvedaOne design system (screen_Checkout.html, isCheckout block). The
// old 3-card icon-header layout is gone — section headers are now plain text (no icon), and the
// address/shipping icons moved inside their own cards as circular avatar tiles. Biggest change: the
// new source added a full payment-status bottom sheet (processing → success/failed/cancelled),
// replacing the old "just navigate to tracking" placeOrder. Ported verbatim from
// `placeOrder`/`startPaymentTimer`/`confirmOrder`/`retryPayment` (source lines 2549-2550, 3125-3131):
// the 1400ms timer always resolves to `paymentStatus:'success'` — the source only branches to
// failed/cancelled via a `paymentDemoOutcome` prop this app never sets, so those two states are real,
// fully-built UI that's structurally unreachable in practice, same category as Search's dead voice
// panel from an earlier round. Also a genuine quirk, not a bug: `retryPayment` does NOT retry — it's
// wired identically to `confirmOrder` (closes the sheet and jumps straight to order-confirmed), kept
// exactly as authored.
export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cartTotals, flash } = useAppState();
  const { cartLines, subtotal, taxAmount, shippingFee, payTotal } = cartTotals;

  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('processing');
  const paymentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (paymentTimer.current) clearTimeout(paymentTimer.current);
    };
  }, []);

  const goCart = () => router.push('/cart');

  // The source's own `placeOrder`/`startPaymentTimer` never target anything but 'success' in this
  // app (no `paymentDemoOutcome` prop exists here) — preserved verbatim, not "fixed" into a random
  // outcome roll.
  const placeOrder = () => {
    if (paymentTimer.current) clearTimeout(paymentTimer.current);
    setPaymentStatus('processing');
    setPaymentSheetOpen(true);
    paymentTimer.current = setTimeout(() => setPaymentStatus('success'), 1400);
  };
  const closePaymentSheet = () => setPaymentSheetOpen(false);
  // `confirmOrder` and `retryPayment` are the same handler in the source — both just close the sheet
  // and land on Order Confirmed (source lines 3130-3131). Ported verbatim: the order id itself is
  // always the constant `ORDER_CONFIRMED_ID` (29), never derived from this cart — see
  // `orders-content.ts`'s comment for why "View order" from that screen then shows order #24, not #29.
  const goToOrderConfirmed = () => {
    setPaymentSheetOpen(false);
    router.push({ pathname: '/order-confirmed', params: { amount: payTotal } });
  };

  // The new source's Policies rows open a real shared policy-detail sheet (also referenced by the
  // still-unmigrated Account screen). Building that shared sheet is out of scope for a Checkout-only
  // round — same deferral the Product round used for "Learn more" — so these are lightweight
  // placeholders for now rather than dead no-ops.
  const openReturnPolicy = () => flash('Return, Refund and Cancellation Policy');
  const openShippingPolicy = () => flash('Shipping and Delivery Policy');

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + dsSpacing.md }]}>
        <Pressable onPress={goCart} style={styles.backButton} hitSlop={4}>
          <SmallBackChevronIcon size={9} color={ds.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Checkout</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Delivery address</Text>
            <Text style={styles.changeLink}>Change</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.iconAvatar}>
              <LocationPinIcon size={15} color={ds.primaryInk} />
            </View>
            <View style={styles.addressText}>
              <Text style={styles.addressName}>{deliveryAddress.name}</Text>
              <Text style={styles.addressLines}>
                {deliveryAddress.city}
                {'\n'}
                {deliveryAddress.line}
                {'\n'}Phone: {deliveryAddress.phone}
              </Text>
            </View>
          </View>
        </View>

        <View>
          <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Shipping</Text>
          <View style={[styles.card, styles.shippingCard]}>
            <View style={styles.shippingLeft}>
              <View style={styles.iconAvatar}>
                <ShippingBoxIcon size={15} color={ds.primaryInk} />
              </View>
              <Text style={styles.shippingLabel}>Express shipping</Text>
            </View>
            <Text style={styles.shippingValue}>{shippingFee}</Text>
          </View>
        </View>

        <View>
          <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Order summary</Text>
          <View style={[styles.card, styles.summaryCard]}>
            {cartLines.map((line) => (
              <View key={line.id} style={styles.lineRow}>
                <View style={[styles.lineThumb, { backgroundColor: line.tint }]} />
                <Text style={styles.lineName} numberOfLines={1}>
                  {line.qty} × {line.name}
                </Text>
                <View style={styles.lineAmounts}>
                  <Text style={styles.lineTotal}>{line.total}</Text>
                  {line.hasOffer && <Text style={styles.lineMrp}>{line.mrpTotal}</Text>}
                </View>
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
              <Text style={styles.totalLabel}>Total amount</Text>
              <Text style={styles.totalValue}>{payTotal}</Text>
            </View>
          </View>
        </View>

        <View>
          <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Policies</Text>
          <View style={styles.policiesCard}>
            <Pressable onPress={openReturnPolicy} style={[styles.policyRow, styles.policyRowBorder]}>
              <View style={styles.policyIcon}>
                <ReturnPolicyIcon size={18} color={ds.primaryInk} />
              </View>
              <View style={styles.policyText}>
                <Text style={styles.policyTitle}>Return, refund & cancellation</Text>
                <Text style={styles.policySubtitle}>Eligible returns within 10 days of delivery</Text>
              </View>
              <ChevronRightIcon size={16} color={ds.ink3} strokeWidth={1.8} />
            </Pressable>
            <Pressable onPress={openShippingPolicy} style={styles.policyRow}>
              <View style={styles.policyIcon}>
                <ShippingBoxIcon size={18} color={ds.primaryInk} />
              </View>
              <View style={styles.policyText}>
                <Text style={styles.policyTitle}>Shipping & delivery</Text>
                <Text style={styles.policySubtitle}>Delivered in 2–3 business days</Text>
              </View>
              <ChevronRightIcon size={16} color={ds.ink3} strokeWidth={1.8} />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: dsSpacing.md + insets.bottom }]}>
        <View style={styles.footerInfo}>
          <Text style={styles.footerLabel}>To pay</Text>
          <Text style={styles.footerTotal} numberOfLines={1}>{payTotal}</Text>
        </View>
        <Pressable onPress={placeOrder} style={styles.payButton}>
          <Text style={styles.payButtonText}>Proceed to payment</Text>
          <ArrowRightIcon size={13} color={ds.surface} strokeWidth={2.2} />
        </Pressable>
      </View>

      {paymentSheetOpen && (
        <>
          <Pressable onPress={closePaymentSheet} style={styles.scrim} />
          <View style={[styles.paymentSheet, { paddingBottom: dsSpacing.xl + insets.bottom }]}>
            {paymentStatus === 'processing' && (
              <>
                <View style={[styles.statusIcon, { backgroundColor: ds.primarySoft }]}>
                  <ProcessingSparkleIcon size={24} color={ds.primaryStrong} />
                </View>
                <Text style={styles.statusTitle}>Processing payment…</Text>
                <Text style={styles.statusSubtitle}>Please don&apos;t close or refresh this screen.</Text>
              </>
            )}

            {paymentStatus === 'success' && (
              <>
                <View style={[styles.statusIcon, { backgroundColor: ds.primaryStrong }]}>
                  <CheckThinIcon size={24} color={ds.surface} />
                </View>
                <Text style={styles.statusTitle}>Payment successful</Text>
                <Text style={styles.statusSubtitle}>Your payment of {payTotal} went through.</Text>
                <Pressable onPress={goToOrderConfirmed} style={styles.statusButton}>
                  <Text style={styles.statusButtonText}>Continue</Text>
                </Pressable>
              </>
            )}

            {paymentStatus === 'failed' && (
              <>
                <View style={[styles.statusIcon, { backgroundColor: ds.dangerInk }]}>
                  <CloseIcon size={24} color={ds.surface} strokeWidth={3} />
                </View>
                <Text style={styles.statusTitle}>Payment failed</Text>
                <Text style={styles.statusSubtitle}>We couldn&apos;t process your payment. No amount was deducted.</Text>
                <Pressable onPress={goToOrderConfirmed} style={styles.statusButton}>
                  <Text style={styles.statusButtonText}>Retry payment</Text>
                </Pressable>
                <Pressable onPress={closePaymentSheet} hitSlop={4}>
                  <Text style={styles.statusCancel}>Cancel</Text>
                </Pressable>
              </>
            )}

            {paymentStatus === 'cancelled' && (
              <>
                <View style={[styles.statusIcon, styles.statusIconOutlined]}>
                  <AlertCircleIcon size={24} color={ds.accent} />
                </View>
                <Text style={styles.statusTitle}>Payment cancelled</Text>
                <Text style={styles.statusSubtitle}>You cancelled the payment before it completed.</Text>
                <Pressable onPress={goToOrderConfirmed} style={styles.statusButton}>
                  <Text style={styles.statusButtonText}>Retry payment</Text>
                </Pressable>
                <Pressable onPress={closePaymentSheet} hitSlop={4}>
                  <Text style={styles.statusCancel}>Cancel</Text>
                </Pressable>
              </>
            )}
          </View>
        </>
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
  headerTitle: { ...dsType.h2 },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: dsSpacing.lg, paddingTop: dsSpacing.lg, paddingBottom: dsSpacing.xl, gap: dsSpacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: dsSpacing.md },
  sectionTitle: { ...dsType.h3 },
  sectionTitleSpaced: { marginBottom: dsSpacing.md },
  changeLink: { fontFamily: dsFontFamily[600], fontSize: 13, lineHeight: 18, color: ds.primaryInk },
  card: { backgroundColor: ds.surface, borderWidth: 1, borderColor: ds.line, borderRadius: dsRadii.button, padding: dsSpacing.md, ...dsElevation.e1 },
  iconAvatar: { flexShrink: 0, width: 32, height: 32, borderRadius: dsRadii.pill, backgroundColor: ds.primarySoft, alignItems: 'center', justifyContent: 'center' },
  addressText: { flex: 1, minWidth: 0, marginLeft: dsSpacing.md },
  addressName: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink },
  addressLines: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink2, marginTop: 4 },
  shippingCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shippingLeft: { flexDirection: 'row', alignItems: 'center', gap: dsSpacing.md },
  shippingLabel: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink },
  shippingValue: { fontFamily: dsFontFamily[700], fontSize: 14, lineHeight: 20, color: ds.ink },
  summaryCard: { padding: dsSpacing.md },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: dsSpacing.sm, paddingVertical: dsSpacing.sm },
  lineThumb: { flexShrink: 0, width: 36, height: 36, borderRadius: dsRadii.input },
  lineName: { flex: 1, minWidth: 0, fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink },
  lineAmounts: { flexShrink: 0, alignItems: 'flex-end' },
  lineTotal: { fontFamily: dsFontFamily[700], fontSize: 14, lineHeight: 20, color: ds.ink },
  lineMrp: { fontFamily: dsFontFamily[400], fontSize: 11, lineHeight: 14, color: ds.ink3, textDecorationLine: 'line-through' },
  divider: { height: 1, backgroundColor: ds.line, marginVertical: dsSpacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryLabel: { fontFamily: dsFontFamily[400], fontSize: 14, lineHeight: 21, color: ds.ink2 },
  summaryValue: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { fontFamily: dsFontFamily[700], fontSize: 18, lineHeight: 24, letterSpacing: -0.18, color: ds.ink },
  totalValue: { fontFamily: dsFontFamily[700], fontSize: 18, lineHeight: 24, color: ds.primaryInk },
  policiesCard: { backgroundColor: ds.surface, borderWidth: 1, borderColor: ds.line, borderRadius: dsRadii.button, overflow: 'hidden', ...dsElevation.e1 },
  policyRow: { flexDirection: 'row', alignItems: 'center', gap: dsSpacing.md, padding: dsSpacing.md },
  policyRowBorder: { borderBottomWidth: 1, borderBottomColor: ds.line },
  policyIcon: { flexShrink: 0, width: 40, height: 40, borderRadius: dsRadii.pill, backgroundColor: ds.primarySoft, alignItems: 'center', justifyContent: 'center' },
  policyText: { flex: 1, minWidth: 0 },
  policyTitle: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink },
  policySubtitle: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink2, marginTop: 2 },
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
  footerLabel: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink2 },
  footerTotal: { fontFamily: dsFontFamily[700], fontSize: 18, lineHeight: 24, letterSpacing: -0.18, color: ds.primaryInk },
  payButton: {
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
  payButtonText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.surface },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(12,71,51,.45)' },
  // Source has no grabber on this specific sheet instance (unlike the generic §8.8 spec) — matched
  // verbatim, not added.
  paymentSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: ds.surface,
    borderTopLeftRadius: dsRadii.sheet,
    borderTopRightRadius: dsRadii.sheet,
    alignItems: 'center',
    overflow: 'hidden',
    paddingHorizontal: dsSpacing.lg,
    paddingTop: dsSpacing.xl,
    ...dsElevation.e3,
  },
  statusIcon: { width: 56, height: 56, borderRadius: dsRadii.pill, alignItems: 'center', justifyContent: 'center' },
  statusIconOutlined: { backgroundColor: ds.canvas, borderWidth: 1.5, borderColor: ds.line },
  // Source literally uses 16px here (not the design system's stated 4/8/12/20/32 scale) — replicated
  // as authored rather than snapped to the nearest allowed value.
  statusTitle: { fontFamily: dsFontFamily[700], fontSize: 16, lineHeight: 22, letterSpacing: -0.16, color: ds.ink, marginTop: 16, textAlign: 'center' },
  statusSubtitle: { fontFamily: dsFontFamily[400], fontSize: 14, lineHeight: 21, color: ds.ink2, marginTop: 4, textAlign: 'center' },
  // Source uses radius 10 for these two buttons specifically, not the standard 12 (dsRadii.button) —
  // replicated as authored.
  statusButton: { marginTop: dsSpacing.lg, width: '100%', height: 48, borderRadius: 10, backgroundColor: ds.primaryStrong, alignItems: 'center', justifyContent: 'center' },
  statusButtonText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.surface },
  statusCancel: { marginTop: dsSpacing.md, fontFamily: dsFontFamily[600], fontSize: 13, lineHeight: 18, color: ds.ink2 },
});
