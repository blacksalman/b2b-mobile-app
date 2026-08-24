import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ds, dsElevation, dsFontFamily, dsRadii, dsSpacing } from '@/theme';
import { CheckThinIcon, DeliveryTruckIcon, OrderBoxIcon } from '@/icons';
import { deliveryAddress } from '@/data/cartTotals';
import { ORDER_CONFIRMED_ID } from '@/data/orders-content';
import { money } from '@/utils/money';

// Built against the new AyurvedaOne design system (screen_OrderConfirmed.html, isOrderConfirmed
// block) — net-new screen, reached from Checkout's payment-success sheet (which previously landed on
// the `tracking.tsx` stub). Ported verbatim from source lines 3130-3135 (fully in range): the order id
// is always the constant 29 (`ORDER_CONFIRMED_ID`, shared with `orders-content.ts`), and "View order"
// (`viewOrder`) navigates to Order Detail with that same id — which isn't in `ORDERS`, so it actually
// falls back to showing order #24 there (see `findOrder`'s comment). Not fixed, matches source.
export default function OrderConfirmedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { amount } = useLocalSearchParams<{ amount?: string }>();
  const amountLabel = amount ?? money(0);

  const viewOrder = () => router.push(`/orders/${ORDER_CONFIRMED_ID}`);
  const continueShopping = () => router.push('/');
  const callSupport = () => Linking.openURL('tel:08049670477');

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <View style={[styles.hero, { paddingTop: insets.top + dsSpacing.xl }]}>
          <View style={styles.checkCircle}>
            <CheckThinIcon size={28} color={ds.primaryInk} />
          </View>
          <Text style={styles.heroTitle}>Order confirmed</Text>
          <Text style={styles.heroSubtitle}>We&apos;ve received order #{ORDER_CONFIRMED_ID} and are getting it ready for dispatch.</Text>
        </View>

        <View style={styles.cardsWrap}>
          <View style={styles.card}>
            <View style={styles.cardTopRow}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconAvatar}>
                  <OrderBoxIcon size={15} color={ds.primaryInk} />
                </View>
                <Text style={styles.cardHeaderTitle}>Order information</Text>
              </View>
              <View style={styles.paidBadge}>
                <Text style={styles.paidBadgeText}>PAID</Text>
              </View>
            </View>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryLabel}>Order ID</Text>
                <Text style={styles.summaryValue}>#{ORDER_CONFIRMED_ID}</Text>
              </View>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryLabel}>Amount paid</Text>
                <Text style={styles.summaryValue}>{amountLabel}</Text>
              </View>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryLabel}>Payment method</Text>
                <Text style={styles.summaryValue}>UPI</Text>
              </View>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryLabel}>Est. delivery</Text>
                <Text style={styles.summaryValue}>2–3 business days</Text>
              </View>
            </View>
          </View>

          <View style={[styles.card, styles.addressCard]}>
            <View style={styles.iconAvatar}>
              <DeliveryTruckIcon size={15} color={ds.primaryInk} />
            </View>
            <View style={styles.addressText}>
              <Text style={styles.addressName}>{deliveryAddress.name}</Text>
              <Text style={styles.addressLine} numberOfLines={1}>{deliveryAddress.line}</Text>
            </View>
          </View>

          <View style={[styles.card, styles.helpCard]}>
            <Text style={styles.helpText}>Need help with your order?</Text>
            <Pressable onPress={callSupport} hitSlop={4}>
              <Text style={styles.helpLink}>Call 08049670477</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: dsSpacing.md + insets.bottom }]}>
        <Pressable onPress={viewOrder} style={styles.viewOrderButton}>
          <Text style={styles.viewOrderText}>View order</Text>
        </Pressable>
        <Pressable onPress={continueShopping} style={styles.continueButton}>
          <Text style={styles.continueText}>Continue shopping</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ds.canvas },
  body: { flex: 1 },
  bodyContent: { paddingBottom: dsSpacing.xl },
  hero: { backgroundColor: ds.inverse, paddingHorizontal: dsSpacing.lg, paddingBottom: 28, alignItems: 'center' },
  checkCircle: { width: 64, height: 64, borderRadius: dsRadii.pill, backgroundColor: ds.surface, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontFamily: dsFontFamily[700], fontSize: 22, lineHeight: 28, letterSpacing: -0.22, color: ds.surface, marginTop: dsSpacing.md, textAlign: 'center' },
  heroSubtitle: { fontFamily: dsFontFamily[400], fontSize: 14, lineHeight: 21, color: 'rgba(255,255,255,.78)', marginTop: 6, maxWidth: 280, textAlign: 'center' },
  cardsWrap: { paddingHorizontal: dsSpacing.lg, gap: dsSpacing.md, marginTop: -16 },
  card: { backgroundColor: ds.surface, borderRadius: dsRadii.button, padding: dsSpacing.md, ...dsElevation.e1 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: dsSpacing.sm },
  iconAvatar: { flexShrink: 0, width: 32, height: 32, borderRadius: dsRadii.pill, backgroundColor: ds.primarySoft, alignItems: 'center', justifyContent: 'center' },
  cardHeaderTitle: { fontFamily: dsFontFamily[700], fontSize: 16, lineHeight: 22, letterSpacing: -0.16, color: ds.ink },
  paidBadge: { backgroundColor: ds.primaryStrong, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  paidBadgeText: { fontFamily: dsFontFamily[600], fontSize: 11, lineHeight: 14, color: ds.surface },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: dsSpacing.md, marginTop: dsSpacing.md },
  summaryCell: { width: '46%', flexGrow: 1 },
  summaryLabel: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink2 },
  summaryValue: { fontFamily: dsFontFamily[700], fontSize: 15, lineHeight: 20, color: ds.ink, marginTop: 4 },
  addressCard: { flexDirection: 'row', alignItems: 'center', gap: dsSpacing.md },
  addressText: { flex: 1, minWidth: 0 },
  addressName: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink },
  addressLine: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink2, marginTop: 2 },
  helpCard: { alignItems: 'center' },
  helpText: { fontFamily: dsFontFamily[400], fontSize: 13, lineHeight: 19, color: ds.ink2 },
  helpLink: { fontFamily: dsFontFamily[700], fontSize: 15, lineHeight: 20, color: ds.inverse, marginTop: 6 },
  footer: {
    flexShrink: 0,
    backgroundColor: ds.surface,
    borderTopWidth: 1,
    borderTopColor: ds.line,
    paddingHorizontal: dsSpacing.lg,
    paddingTop: dsSpacing.md,
    flexDirection: 'row',
    gap: dsSpacing.md,
  },
  viewOrderButton: { flex: 1, height: 48, borderRadius: dsRadii.button, borderWidth: 1.5, borderColor: ds.primary, alignItems: 'center', justifyContent: 'center' },
  viewOrderText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.primaryInk },
  continueButton: { flex: 1, height: 48, borderRadius: dsRadii.button, backgroundColor: ds.primaryStrong, alignItems: 'center', justifyContent: 'center' },
  continueText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.surface },
});
