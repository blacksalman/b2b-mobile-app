import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ds, dsFontFamily, dsRadii, dsSpacing, dsType, dsElevation } from '@/theme';
import {
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
import { useAppState } from '@/state/AppStateContext';
import { getCartId, resetCartAfterOrder } from '@/data/cartSync';
import {
  fetchCart,
  fetchShippingOptions,
  addShippingMethod,
  setCartAddress,
  createSystemPaymentSession,
  completeCart,
  type MedusaCart,
  type MedusaShippingOption,
} from '@/lib/medusaCart';
import { fetchAddresses, type MedusaAddress } from '@/lib/medusaAddresses';
import { money } from '@/utils/money';

type PaymentStatus = 'processing' | 'success' | 'failed';

// Rebuilt against the new AyurvedaOne design system (screen_Checkout.html, isCheckout block), same
// layout as the original mock build - now driven by a real Medusa cart (docs/STORE_API.md section
// 6) instead of the local computeCartTotals fake math. Payment collection uses the built-in
// "system"/manual provider (pp_system_default) rather than the real Razorpay widget - "I will pay
// later" decision (Checkout payment scope question) - so this creates a genuinely real order with
// no online payment collected, closer to a pay-on-account/COD model than a paid checkout. Swapping
// in the Razorpay widget later only touches placeOrder()'s payment-session call.
export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { loggedIn, customer, clearCart, flash } = useAppState();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cart, setCart] = useState<MedusaCart | null>(null);
  const [address, setAddress] = useState<MedusaAddress | null>(null);
  const [shippingOption, setShippingOption] = useState<MedusaShippingOption | null>(null);

  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('processing');
  const [orderError, setOrderError] = useState('');
  const [placedOrder, setPlacedOrder] = useState<{ id: string; display_id: number; total: number } | null>(null);
  const placing = useRef(false);

  const loadCheckout = useCallback(async () => {
    if (!customer) return;
    setLoading(true);
    setLoadError(null);
    try {
      const cartId = await getCartId();
      const addresses = await fetchAddresses();
      const selected = addresses.find((a) => a.is_default_shipping) ?? addresses[0] ?? null;
      setAddress(selected);

      if (!selected) {
        setCart(await fetchCart(cartId));
        setShippingOption(null);
        return;
      }

      let currentCart = await setCartAddress(cartId, customer.email, {
        first_name: selected.first_name ?? '',
        last_name: selected.last_name ?? undefined,
        company: selected.company ?? undefined,
        address_1: selected.address_1,
        address_2: selected.address_2 ?? undefined,
        city: selected.city,
        province: selected.province ?? undefined,
        postal_code: selected.postal_code,
        country_code: selected.country_code,
        phone: selected.phone ?? undefined,
      });

      const options = await fetchShippingOptions(cartId);
      const cheapest = options.length ? options.reduce((min, o) => (o.amount < min.amount ? o : min)) : null;
      setShippingOption(cheapest);

      // shipping_total > 0 means a shipping method is already attached from an earlier visit to
      // this screen - re-adding one every time this reloads (e.g. on every focus) would otherwise
      // double up the shipping line.
      if (cheapest && currentCart.shipping_total <= 0) {
        currentCart = await addShippingMethod(cartId, cheapest.id);
      }

      setCart(currentCart);
    } catch {
      setLoadError('Could not load checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [customer]);

  // Re-runs every time this screen regains focus (not just on mount) - Checkout stays mounted
  // underneath when "Change" pushes /addresses, so picking a different default address there
  // needs a fresh load on the way back, same reasoning as Search's own useFocusEffect.
  useFocusEffect(
    useCallback(() => {
      loadCheckout();
    }, [loadCheckout])
  );

  const goCart = () => router.push('/cart');
  // Addresses' own back button defaults to Account (a preserved quirk from when Account was its
  // only entry point) - `from=checkout` tells it to return here instead.
  const goAddresses = () => router.push('/addresses?from=checkout');

  const placeOrder = async () => {
    if (!cart || placing.current) return;
    placing.current = true;
    setOrderError('');
    setPaymentStatus('processing');
    setPaymentSheetOpen(true);
    try {
      await createSystemPaymentSession(cart.id);
      const result = await completeCart(cart.id);
      if (result.type === 'order') {
        setPlacedOrder(result.order);
        await resetCartAfterOrder();
        clearCart();
        setPaymentStatus('success');
      } else {
        setOrderError(result.error);
        setPaymentStatus('failed');
      }
    } catch {
      setOrderError('Something went wrong placing your order.');
      setPaymentStatus('failed');
    } finally {
      placing.current = false;
    }
  };
  const closePaymentSheet = () => setPaymentSheetOpen(false);
  const retryOrder = () => {
    setPaymentSheetOpen(false);
    placeOrder();
  };
  const goToOrderConfirmed = () => {
    setPaymentSheetOpen(false);
    if (!placedOrder) return;
    router.push({
      pathname: '/order-confirmed',
      params: { orderId: placedOrder.id, displayId: String(placedOrder.display_id), amount: money(placedOrder.total) },
    });
  };

  const openReturnPolicy = () => flash('Return, Refund and Cancellation Policy');
  const openShippingPolicy = () => flash('Shipping and Delivery Policy');

  if (!loggedIn) {
    return (
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + dsSpacing.md }]}>
          <Pressable onPress={goCart} style={styles.backButton} hitSlop={4}>
            <SmallBackChevronIcon size={9} color={ds.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>Checkout</Text>
        </View>
        <View style={styles.centerState}>
          <Text style={styles.centerTitle}>Log in to check out</Text>
          <Text style={styles.centerBody}>Sign in to your trade account to place a real order.</Text>
          <Pressable onPress={() => router.push('/auth/phone')} style={styles.centerButton}>
            <Text style={styles.centerButtonText}>Log in</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (loading || !cart) {
    return (
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + dsSpacing.md }]}>
          <Pressable onPress={goCart} style={styles.backButton} hitSlop={4}>
            <SmallBackChevronIcon size={9} color={ds.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>Checkout</Text>
        </View>
        <View style={styles.centerState}>
          {loadError ? <Text style={styles.centerBody}>{loadError}</Text> : <ActivityIndicator color={ds.primaryInk} />}
        </View>
      </View>
    );
  }

  const shippingFeeLabel = shippingOption ? money(shippingOption.amount) : money(cart.shipping_total);

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
            <Pressable onPress={goAddresses}>
              <Text style={styles.changeLink}>{address ? 'Change' : 'Add'}</Text>
            </Pressable>
          </View>
          <View style={styles.card}>
            <View style={styles.iconAvatar}>
              <LocationPinIcon size={15} color={ds.primaryInk} />
            </View>
            {address ? (
              <View style={styles.addressText}>
                <Text style={styles.addressName}>
                  {[address.first_name, address.last_name].filter(Boolean).join(' ')}
                </Text>
                <Text style={styles.addressLines}>
                  {address.address_1}
                  {'\n'}
                  {address.city}, {address.province} {address.postal_code}
                  {'\n'}Phone: {address.phone}
                </Text>
              </View>
            ) : (
              <View style={styles.addressText}>
                <Text style={styles.addressName}>No delivery address yet</Text>
                <Text style={styles.addressLines}>Add one to place your order.</Text>
              </View>
            )}
          </View>
        </View>

        <View>
          <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Shipping</Text>
          <View style={[styles.card, styles.shippingCard]}>
            <View style={styles.shippingLeft}>
              <View style={styles.iconAvatar}>
                <ShippingBoxIcon size={15} color={ds.primaryInk} />
              </View>
              <Text style={styles.shippingLabel}>{shippingOption?.name ?? 'Shipping'}</Text>
            </View>
            <Text style={styles.shippingValue}>{shippingFeeLabel}</Text>
          </View>
        </View>

        <View>
          <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Order summary</Text>
          <View style={[styles.card, styles.summaryCard]}>
            {cart.items.map((line) => {
              // Same real per-line GST rate the real cart's own tax calculation already resolved
              // (confirmed live) that Cart (cartApi.ts's buildLine) applies - shows the same
              // tax-included number here instead of the raw tax-exclusive unit_price.
              const taxMult = 1 + (line.tax_lines?.reduce((sum, t) => sum + t.rate, 0) ?? 0) / 100;
              return (
                <View key={line.id} style={styles.lineRow}>
                  {line.thumbnail ? (
                    <Image source={{ uri: line.thumbnail }} style={styles.lineThumb} />
                  ) : (
                    <View style={styles.lineThumb} />
                  )}
                  <Text style={styles.lineName} numberOfLines={1}>
                    {line.quantity} × {line.product_title}
                  </Text>
                  <Text style={styles.lineTotal}>{money(line.unit_price * line.quantity * taxMult)}</Text>
                </View>
              );
            })}
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{money(cart.item_subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping</Text>
              <Text style={styles.summaryValue}>{money(cart.shipping_total)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>GST</Text>
              <Text style={styles.summaryValue}>{money(cart.tax_total)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total amount</Text>
              <Text style={styles.totalValue}>{money(cart.total)}</Text>
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
          <Text style={styles.footerTotal} numberOfLines={1}>{money(cart.total)}</Text>
        </View>
        <Pressable
          onPress={placeOrder}
          disabled={!address || cart.items.length === 0}
          style={[styles.payButton, (!address || cart.items.length === 0) && styles.payButtonDisabled]}
        >
          <Text style={styles.payButtonText}>Place order</Text>
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
                <Text style={styles.statusTitle}>Placing your order…</Text>
                <Text style={styles.statusSubtitle}>Please don&apos;t close or refresh this screen.</Text>
              </>
            )}

            {paymentStatus === 'success' && (
              <>
                <View style={[styles.statusIcon, { backgroundColor: ds.primaryStrong }]}>
                  <CheckThinIcon size={24} color={ds.surface} />
                </View>
                <Text style={styles.statusTitle}>Order placed</Text>
                <Text style={styles.statusSubtitle}>Your order for {money(cart.total)} has been placed.</Text>
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
                <Text style={styles.statusTitle}>Could not place order</Text>
                <Text style={styles.statusSubtitle}>{orderError || 'Please try again.'}</Text>
                <Pressable onPress={retryOrder} style={styles.statusButton}>
                  <Text style={styles.statusButtonText}>Retry</Text>
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
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: dsSpacing.lg, gap: dsSpacing.sm },
  centerTitle: { ...dsType.h2, textAlign: 'center' },
  centerBody: { ...dsType.body, color: ds.ink2, textAlign: 'center' },
  centerButton: { marginTop: dsSpacing.md, height: 48, paddingHorizontal: dsSpacing.xl, borderRadius: dsRadii.button, backgroundColor: ds.primaryStrong, alignItems: 'center', justifyContent: 'center' },
  centerButtonText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.surface },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: dsSpacing.lg, paddingTop: dsSpacing.lg, paddingBottom: dsSpacing.xl, gap: dsSpacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: dsSpacing.md },
  sectionTitle: { ...dsType.h3 },
  sectionTitleSpaced: { marginBottom: dsSpacing.md },
  changeLink: { fontFamily: dsFontFamily[600], fontSize: 13, lineHeight: 18, color: ds.primaryInk },
  card: { backgroundColor: ds.surface, borderWidth: 1, borderColor: ds.line, borderRadius: dsRadii.button, padding: dsSpacing.md, flexDirection: 'row', alignItems: 'flex-start', ...dsElevation.e1 },
  iconAvatar: { flexShrink: 0, width: 32, height: 32, borderRadius: dsRadii.pill, backgroundColor: ds.primarySoft, alignItems: 'center', justifyContent: 'center' },
  addressText: { flex: 1, minWidth: 0, marginLeft: dsSpacing.md },
  addressName: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink },
  addressLines: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink2, marginTop: 4 },
  shippingCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shippingLeft: { flexDirection: 'row', alignItems: 'center', gap: dsSpacing.md },
  shippingLabel: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink },
  shippingValue: { fontFamily: dsFontFamily[700], fontSize: 14, lineHeight: 20, color: ds.ink },
  // Overrides `card`'s flexDirection: 'row' (correct for the Address card's icon+text layout,
  // wrong here) - without this the line items, divider, and Subtotal/Shipping/GST/Total rows all
  // laid out side-by-side in one row instead of stacking, spilling everything past the first
  // product row off the right edge of the card/screen.
  summaryCard: { padding: dsSpacing.md, flexDirection: 'column', alignItems: 'stretch' },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: dsSpacing.sm, paddingVertical: dsSpacing.sm },
  lineThumb: { flexShrink: 0, width: 36, height: 36, borderRadius: dsRadii.input, backgroundColor: ds.primarySoft },
  lineName: { flex: 1, minWidth: 0, fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink },
  lineTotal: { flexShrink: 0, fontFamily: dsFontFamily[700], fontSize: 14, lineHeight: 20, color: ds.ink },
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
  payButtonDisabled: { opacity: 0.5 },
  payButtonText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.surface },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(12,71,51,.45)' },
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
  statusTitle: { fontFamily: dsFontFamily[700], fontSize: 16, lineHeight: 22, letterSpacing: -0.16, color: ds.ink, marginTop: 16, textAlign: 'center' },
  statusSubtitle: { fontFamily: dsFontFamily[400], fontSize: 14, lineHeight: 21, color: ds.ink2, marginTop: 4, textAlign: 'center' },
  statusButton: { marginTop: dsSpacing.lg, width: '100%', height: 48, borderRadius: 10, backgroundColor: ds.primaryStrong, alignItems: 'center', justifyContent: 'center' },
  statusButtonText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.surface },
  statusCancel: { marginTop: dsSpacing.md, fontFamily: dsFontFamily[600], fontSize: 13, lineHeight: 18, color: ds.ink2 },
});
