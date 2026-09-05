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
  createRazorpayPaymentSession,
  completeCart,
  type MedusaCart,
  type MedusaShippingOption,
} from '@/lib/medusaCart';
import { RAZORPAY_KEY_ID, fetchProductsByIds, type MedusaProduct } from '@/lib/medusaClient';
import { buildLine } from '@/data/cartApi';
import { fetchAddresses, type MedusaAddress } from '@/lib/medusaAddresses';
import { money } from '@/utils/money';
import { stripHtml } from '@/utils/stripHtml';
import { RazorpayCheckoutModal } from '@/components/composite/RazorpayCheckoutModal';
import { PolicySheet } from '@/components/shell/PolicySheet';
import { usePolicies } from '@/data/account-content';
import type { RazorpayCheckoutParams } from '@/lib/razorpayCheckout';

type PaymentStatus = 'processing' | 'success' | 'failed';

// Number of completeCart() retries after a successful Razorpay payment before giving up and
// showing a real failure - see completeOrder's own comment for why a retry is needed at all.
const COMPLETE_RETRY_ATTEMPTS = 3;
const COMPLETE_RETRY_DELAY_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// True when the cart's currently-stored shipping address already matches the address book entry
// Checkout would otherwise re-PATCH onto it - lets loadCheckout skip setCartAddress/
// fetchShippingOptions/addShippingMethod entirely on a repeat visit where nothing changed, rather
// than re-running that whole chain on every single focus regardless.
// Prefers a real delivery option over a self-pickup one when auto-selecting checkout's default
// shipping method - picking "cheapest by amount" alone (the old logic) started silently defaulting
// to "Express Pickup" the moment that option became eligible for a cart's address, which reads as
// this order being pickup-only when the customer never asked for that. Pickup is meant to be a
// separate Ops-side action (see the Local Courier dispatch plan's "Physically Collected" flow), not
// something checkout quietly opts a customer into. Falls back to the cheapest pickup option only if
// genuinely nothing else is available, so checkout never has zero shipping options to show.
function pickDefaultShippingOption(options: MedusaShippingOption[]): MedusaShippingOption | null {
  if (!options.length) return null;
  const isPickup = (o: MedusaShippingOption) => /pickup/i.test(o.name);
  const deliveryOptions = options.filter((o) => !isPickup(o));
  const pool = deliveryOptions.length ? deliveryOptions : options;
  return pool.reduce((min, o) => (o.amount < min.amount ? o : min));
}

function addressesMatch(cartAddr: MedusaCart['shipping_address'], selected: MedusaAddress): boolean {
  if (!cartAddr) return false;
  return (
    (cartAddr.first_name ?? '') === (selected.first_name ?? '') &&
    (cartAddr.last_name ?? '') === (selected.last_name ?? '') &&
    (cartAddr.company ?? '') === (selected.company ?? '') &&
    cartAddr.address_1 === selected.address_1 &&
    (cartAddr.address_2 ?? '') === (selected.address_2 ?? '') &&
    cartAddr.city === selected.city &&
    (cartAddr.province ?? '') === (selected.province ?? '') &&
    cartAddr.postal_code === selected.postal_code &&
    cartAddr.country_code === selected.country_code &&
    (cartAddr.phone ?? '') === (selected.phone ?? '')
  );
}

// Rebuilt against the new AyurvedaOne design system (screen_Checkout.html, isCheckout block), same
// layout as the original mock build - now driven by a real Medusa cart (docs/STORE_API.md section
// 6) instead of the local computeCartTotals fake math. Payment now goes through the real Razorpay
// provider (pp_razorpay_razorpay, confirmed live: real Razorpay TEST-mode credentials, India
// region already has it enabled) via a WebView hosting Razorpay's own Checkout.js
// (RazorpayCheckoutModal/razorpayCheckout.ts) - the standard integration for an Expo MANAGED
// workflow app (no android/ios folders here, so the native react-native-razorpay SDK would
// require ejecting to a custom dev client, a real disruption to the existing `npx expo start`/
// Expo Go testing workflow).
export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { loggedIn, customer, clearCart } = useAppState();
  const { policies } = usePolicies();
  const [policyKey, setPolicyKey] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cart, setCart] = useState<MedusaCart | null>(null);
  // Only feeds buildLine's quantity-tier baseline lookup (the struck MRP on a discounted line) -
  // that baseline lives on the variant's price rows, not on the cart line, so the cart response
  // alone can't produce it. Kept deliberately out of the load's critical path, see loadCheckout.
  const [productsById, setProductsById] = useState<Map<string, MedusaProduct>>(new Map());
  const [address, setAddress] = useState<MedusaAddress | null>(null);
  const [shippingOption, setShippingOption] = useState<MedusaShippingOption | null>(null);
  // Mirrors `shippingOption` for loadCheckout to read without depending on it directly - loadCheckout
  // itself calls setShippingOption, so including the state value in its own useCallback deps would
  // change its identity every time it runs, which useFocusEffect (below) would then read as "re-run
  // the effect" while the screen is still focused - an infinite reload loop.
  const shippingOptionRef = useRef<MedusaShippingOption | null>(null);
  shippingOptionRef.current = shippingOption;

  const [startingPayment, setStartingPayment] = useState(false);
  const [razorpaySession, setRazorpaySession] = useState<RazorpayCheckoutParams | null>(null);
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
      // getCartId (usually an already-cached in-memory id, see cartSync.ts) and fetchAddresses
      // don't depend on each other - running them together instead of one-after-another cuts one
      // full round trip off every single load, not just the first.
      const [cartId, addresses] = await Promise.all([getCartId(), fetchAddresses()]);
      const selected = addresses.find((a) => a.is_default_shipping) ?? addresses[0] ?? null;
      setAddress(selected);

      let currentCart = await fetchCart(cartId);

      // Deliberately NOT awaited, and deliberately started here so it overlaps the
      // setCartAddress -> fetchShippingOptions -> addShippingMethod chain below instead of adding a
      // fourth serial round trip to a load this function already works hard to keep short. Nothing
      // downstream depends on it - it only enriches the Order summary's struck MRP, and the render
      // treats a missing product exactly like a product with no tier baseline (no strike-through,
      // correct price either way), so the strike simply appears a moment later on a slow network.
      // A failure here must never fail checkout itself, hence the swallowed catch.
      if (currentCart.items.length) {
        fetchProductsByIds([...new Set(currentCart.items.map((i) => i.product_id))])
          .then((products) => setProductsById(new Map(products.map((p) => [p.id, p] as const))))
          .catch(() => {});
      } else {
        setProductsById(new Map());
      }

      if (!selected) {
        setCart(currentCart);
        setShippingOption(null);
        return;
      }

      // Re-focusing this screen (it stays mounted underneath "Change address"/back navigation, see
      // the useFocusEffect comment below) previously re-ran setCartAddress -> fetchShippingOptions
      // -> addShippingMethod unconditionally every single time, even when nothing about the
      // address had changed since the last visit - 3 sequential network round trips for no reason.
      // Skipping the whole chain when the cart's stored address already matches and a shipping
      // method is already attached (and this screen already resolved one before, so `shippingOption`
      // has something to keep showing) is what actually fixes the repeat-visit slowness; a real
      // address change still falls through and re-resolves everything, same as before.
      if (addressesMatch(currentCart.shipping_address, selected) && currentCart.shipping_total > 0 && shippingOptionRef.current) {
        setCart(currentCart);
        return;
      }

      currentCart = await setCartAddress(cartId, customer.email, {
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
      const cheapest = pickDefaultShippingOption(options);
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

  // Opens the real Razorpay payment sheet (a fresh Razorpay order every attempt - retryOrder
  // below just calls this again, so a failed/expired attempt never gets reused).
  const placeOrder = async () => {
    if (!cart || placing.current) return;
    placing.current = true;
    setOrderError('');
    setStartingPayment(true);
    try {
      const session = await createRazorpayPaymentSession(cart.id);
      setRazorpaySession({
        keyId: RAZORPAY_KEY_ID,
        orderId: session.orderId,
        amount: session.amount,
        currency: session.currency,
        name: 'AyurvedaOne',
        description: `Order payment - ${cart.items.length} item${cart.items.length === 1 ? '' : 's'}`,
        prefillName: [customer?.first_name, customer?.last_name].filter(Boolean).join(' '),
        prefillEmail: customer?.email,
        // Razorpay's prefill.contact wants a plain 10-digit number, not the "+91"-prefixed form
        // customer.phone is stored in (same strip edit-profile.tsx/addresses.tsx already do).
        prefillContact: (customer?.phone ?? '').replace(/^\+91/, ''),
        themeColor: ds.primaryStrong,
      });
    } catch {
      setOrderError('Could not start payment. Please try again.');
      setPaymentStatus('failed');
      setPaymentSheetOpen(true);
    } finally {
      setStartingPayment(false);
      placing.current = false;
    }
  };

  // Called once Razorpay's own Checkout.js reports success (razorpay_payment_id, confirmed real
  // by Razorpay's own client-side widget, not yet Medusa-verified). Medusa does NOT trust that
  // client-side signal at all - confirmed in the provider plugin's source that authorizePayment
  // independently re-checks payment status with a LIVE call to Razorpay's own API
  // (razorpay.orders.fetch/fetchPayments) the moment completeCart runs, so this is genuinely safe
  // to call immediately rather than needing a separate signature-submission step (the plugin has
  // no endpoint for one anyway - its updatePayment always throws NOT_ALLOWED). The only real
  // failure mode is Razorpay-side propagation lag between "payment authorized" and that being
  // reflected on a fresh orders.fetch call, which surfaces as a retryable cart-complete failure -
  // handled by retrying a few times with a short delay before treating it as a genuine failure.
  const completeOrder = async (attempt = 1): Promise<void> => {
    if (!cart) return;
    try {
      const result = await completeCart(cart.id);
      if (result.type === 'order') {
        setPlacedOrder(result.order);
        await resetCartAfterOrder();
        clearCart();
        setPaymentStatus('success');
        return;
      }
      if (attempt < COMPLETE_RETRY_ATTEMPTS) {
        await sleep(COMPLETE_RETRY_DELAY_MS);
        return completeOrder(attempt + 1);
      }
      setOrderError(result.error);
      setPaymentStatus('failed');
    } catch {
      setOrderError('Something went wrong placing your order.');
      setPaymentStatus('failed');
    }
  };

  const onRazorpaySuccess = () => {
    setRazorpaySession(null);
    setOrderError('');
    setPaymentStatus('processing');
    setPaymentSheetOpen(true);
    completeOrder();
  };
  // Customer backed out of the Razorpay sheet themselves (closed it / tapped outside, Razorpay's
  // own `modal.ondismiss`) - no payment was attempted, but from the customer's point of view the
  // order still didn't go through, so this shows the same failure sheet as a real payment error.
  const onRazorpayDismiss = () => {
    setRazorpaySession(null);
    setOrderError('Payment was not completed. Please try again.');
    setPaymentStatus('failed');
    setPaymentSheetOpen(true);
  };
  const onRazorpayError = (message: string) => {
    setRazorpaySession(null);
    setOrderError(message);
    setPaymentStatus('failed');
    setPaymentSheetOpen(true);
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
      params: {
        orderId: placedOrder.id,
        displayId: String(placedOrder.display_id),
        amount: money(placedOrder.total),
        pincode: address?.postal_code ?? '',
      },
    });
  };

  const openReturnPolicy = () => setPolicyKey('returns');
  const openShippingPolicy = () => setPolicyKey('shipping');
  const closePolicy = () => setPolicyKey(null);
  const policy = policyKey ? policies.find((p) => p.key === policyKey) ?? null : null;
  // Same fix as product/[id].tsx's own Policies section - only show a row for a policy an admin
  // has actually configured, with its real title/summary instead of hardcoded fake copy.
  const returnsPolicy = policies.find((p) => p.key === 'returns') ?? null;
  const shippingPolicy = policies.find((p) => p.key === 'shipping') ?? null;

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

  // Built once here rather than inside the row map, since the Total row below needs the same lines
  // to work out what was saved - see cartApi.ts's buildLine for what each line resolves.
  const lines = cart.items.map((item) => buildLine(item, productsById.get(item.product_id)));

  // Pre-discount counterpart of cart.total, for the struck figure on the Total row. Derived as
  // "real total + what the discounts took off" rather than by rebuilding the total from
  // items + shipping: cart.total is the only number here that's authoritative about everything
  // folded into it (shipping and its tax, and anything else Medusa applies), so adding the savings
  // back onto it stays correct without this screen having to re-model how a total is composed.
  // Savings are per line and tax-included, matching the struck per-line figures shown above.
  const discountSavings = lines.reduce(
    (sum, l) => sum + (l.hasDiscount ? l.lineMrpTotalWithTax! - l.lineTotalWithTax : 0),
    0
  );
  // Guarded against float dust (1.05 multipliers don't land exactly) so a cart with no real
  // discount never shows a struck total a fraction of a paisa above the real one.
  const hasDiscount = discountSavings > 0.005;

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
            {lines.map((line) => {
              // Built by cartApi.ts's buildLine - the exact same function backing Cart's own line
              // rows - so the tax-included price, the struck MRP and the discount% shown here are
              // the same numbers by construction rather than by a second implementation that can
              // drift (this screen previously re-derived only the price, with its own copy of the
              // taxMult formula and no MRP handling, so a discounted line lost its strike-through
              // between Cart and Checkout).
              return (
                <View key={line.id} style={styles.lineRow}>
                  {line.thumbnail ? (
                    <Image source={{ uri: line.thumbnail }} style={styles.lineThumb} />
                  ) : (
                    <View style={styles.lineThumb} />
                  )}
                  <Text style={styles.lineName} numberOfLines={1}>
                    {line.qty} × {line.name}
                  </Text>
                  <View style={styles.linePrices}>
                    {line.hasDiscount && <Text style={styles.lineMrpStrike}>{line.lineMrpTotalLabel}</Text>}
                    <Text style={styles.lineTotal}>{line.lineTotalLabel}</Text>
                  </View>
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
              <View style={styles.totalRight}>
                {hasDiscount && <Text style={styles.mrpStrike}>{money(cart.total + discountSavings)}</Text>}
                <Text style={styles.totalValue}>{money(cart.total)}</Text>
              </View>
            </View>
          </View>
        </View>

        {(returnsPolicy || shippingPolicy) && (
          <View>
            <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Policies</Text>
            <View style={styles.policiesCard}>
              {returnsPolicy && (
                <Pressable
                  onPress={openReturnPolicy}
                  style={[styles.policyRow, !!shippingPolicy && styles.policyRowBorder]}
                >
                  <View style={styles.policyIcon}>
                    <ReturnPolicyIcon size={18} color={ds.primaryInk} />
                  </View>
                  <View style={styles.policyText}>
                    <Text style={styles.policyTitle}>{returnsPolicy.title}</Text>
                    <Text style={styles.policySubtitle} numberOfLines={1}>
                      {stripHtml(returnsPolicy.body)}
                    </Text>
                  </View>
                  <ChevronRightIcon size={16} color={ds.ink3} strokeWidth={1.8} />
                </Pressable>
              )}
              {shippingPolicy && (
                <Pressable onPress={openShippingPolicy} style={styles.policyRow}>
                  <View style={styles.policyIcon}>
                    <ShippingBoxIcon size={18} color={ds.primaryInk} />
                  </View>
                  <View style={styles.policyText}>
                    <Text style={styles.policyTitle}>{shippingPolicy.title}</Text>
                    <Text style={styles.policySubtitle} numberOfLines={1}>
                      {stripHtml(shippingPolicy.body)}
                    </Text>
                  </View>
                  <ChevronRightIcon size={16} color={ds.ink3} strokeWidth={1.8} />
                </Pressable>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* No insets.bottom: the TabBar below this bar already pads for the home indicator
          (TabBar.tsx), so adding it here only made the bar bottom-heavy. Symmetric padding
          lives in styles.footer, same as the cart and PDP bars. */}
      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <Text style={styles.footerLabel}>To pay</Text>
          <Text style={styles.footerTotal} numberOfLines={1}>{money(cart.total)}</Text>
        </View>
        <Pressable
          onPress={placeOrder}
          disabled={!address || cart.items.length === 0 || startingPayment}
          style={[styles.payButton, (!address || cart.items.length === 0 || startingPayment) && styles.payButtonDisabled]}
        >
          {startingPayment ? (
            <ActivityIndicator color={ds.surface} />
          ) : (
            <>
              <Text style={styles.payButtonText}>Place order</Text>
              <ArrowRightIcon size={14} color={ds.surface} strokeWidth={2.2} />
            </>
          )}
        </Pressable>
      </View>

      <RazorpayCheckoutModal
        visible={!!razorpaySession}
        params={razorpaySession}
        onSuccess={onRazorpaySuccess}
        onDismiss={onRazorpayDismiss}
        onError={onRazorpayError}
      />

      <PolicySheet policy={policy} onClose={closePolicy} />

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
  // Struck MRP sits above the real price, same treatment CartLineCard gives a discounted line's
  // total (mrpTotal there) so the two screens read identically.
  linePrices: { flexShrink: 0, alignItems: 'flex-end' },
  lineMrpStrike: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink3, textDecorationLine: 'line-through' },
  lineTotal: { flexShrink: 0, fontFamily: dsFontFamily[700], fontSize: 14, lineHeight: 20, color: ds.ink },
  divider: { height: 1, backgroundColor: ds.line, marginVertical: dsSpacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryLabel: { fontFamily: dsFontFamily[400], fontSize: 14, lineHeight: 21, color: ds.ink2 },
  summaryValue: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // Same stacked struck-above-real treatment as Cart's own total row (cart.tsx's totalRight/
  // mrpStrike), so the two screens present a discounted total identically.
  totalRight: { alignItems: 'flex-end' },
  mrpStrike: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink3, textDecorationLine: 'line-through' },
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
    paddingVertical: dsSpacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: dsSpacing.md,
    ...dsElevation.e2,
  },
  footerInfo: { minWidth: 0 },
  footerLabel: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink2 },
  footerTotal: { fontFamily: dsFontFamily[700], fontSize: 18, lineHeight: 24, letterSpacing: -0.18, color: ds.primaryInk },
  // 48 high like every other primary CTA in the app (the cart's Checkout button this one follows
  // in the flow, the PDP's Add to Cart, the reviews submit button) - 40 left the final, most
  // consequential button in the funnel visibly smaller than the one that led to it.
  payButton: {
    flexShrink: 0,
    // Floors the button's width so it keeps its presence as the primary action - without it the
    // button is only as wide as "Place order" plus its arrow, and it shrinks further still while
    // the spinner is showing. footerInfo carries minWidth:0, so a long total shrinks rather than
    // squeezing this.
    minWidth: 170,
    height: 48,
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
