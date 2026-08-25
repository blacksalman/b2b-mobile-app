import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ds, dsElevation, dsFontFamily, dsRadii, dsSpacing, dsType } from '@/theme';
import { LocationPinIcon, OrderBoxIcon, ShoppingBagIcon, SmallBackChevronIcon } from '@/icons';
import { useOrder, orderStatusFor, orderItemCount, orderDispatchDate, orderDeliveryDate, ORDER_STATUS_STYLE } from '@/data/ordersApi';
import { money } from '@/utils/money';

function formatDate(iso: string | null): string {
  if (!iso) return 'Pending';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// Rebuilt against the real backend (GET /store/orders/:id, ordersApi.ts's useOrder) - previously
// this screen only ever rendered a hardcoded mock order (orders-content.ts's findOrder, which
// even had its own known quirk: Checkout always handed off order id 29, not in the mock list, so
// "View order" from Order Confirmed silently fell back to order #24 every time). Real order line
// items keep their AT-ORDER-TIME price/thumbnail (item.unit_price/thumbnail) rather than
// re-fetching current catalog data - unlike Buy Again's deliberate "what does this cost today"
// re-fetch, an order's own history should show what was actually charged.
export default function OrderDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { loading, notFound, order } = useOrder(id ?? null);

  const goOrders = () => router.push('/orders');

  if (loading || notFound || !order) {
    return (
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + dsSpacing.md }]}>
          <Pressable onPress={goOrders} style={styles.roundButton} hitSlop={4}>
            <SmallBackChevronIcon size={9} color={ds.ink} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>Order Details</Text>
        </View>
        <View style={styles.centerState}>
          {loading ? <ActivityIndicator color={ds.primaryInk} /> : <Text style={styles.centerText}>Order not found.</Text>}
        </View>
      </View>
    );
  }

  const status = orderStatusFor(order);
  const statusStyle = ORDER_STATUS_STYLE[status];
  const addr = order.shipping_address;
  const addrName = addr ? [addr.first_name, addr.last_name].filter(Boolean).join(' ') : '';

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + dsSpacing.md }]}>
        <Pressable onPress={goOrders} style={styles.roundButton} hitSlop={4}>
          <SmallBackChevronIcon size={9} color={ds.ink} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Order Details</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <View style={styles.banner}>
          <Text style={styles.bannerId}>#{order.display_id}</Text>
          <Text style={styles.bannerDate}>
            Order Date: {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </Text>
        </View>

        <View style={styles.cardsWrap}>
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.iconAvatar}>
                <OrderBoxIcon size={15} color={ds.primaryInk} />
              </View>
              <Text style={styles.cardHeaderTitle}>Order Summary</Text>
            </View>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryLabel}>Total Items</Text>
                <Text style={styles.summaryValue}>{orderItemCount(order)}</Text>
              </View>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryLabel}>Total Price</Text>
                <Text style={styles.summaryValue}>{money(order.total)}</Text>
              </View>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryLabel}>Dispatch Date</Text>
                <Text style={styles.summaryValue}>{formatDate(orderDispatchDate(order))}</Text>
              </View>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryLabel}>Delivery Date</Text>
                <Text style={styles.summaryValue}>{formatDate(orderDeliveryDate(order))}</Text>
              </View>
            </View>
            <View style={[styles.statusStrip, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusStripText, { color: statusStyle.color }]}>Order Status: {status}</Text>
            </View>
          </View>

          {addr && (
            <View style={styles.card}>
              <View style={[styles.cardHeaderRow, styles.cardHeaderTinted]}>
                <View style={styles.iconAvatar}>
                  <LocationPinIcon size={15} color={ds.primaryInk} strokeWidth={1.7} />
                </View>
                <Text style={styles.cardHeaderTitle}>Delivery Address</Text>
              </View>
              <View style={styles.addressBody}>
                <Text style={styles.addressName}>{addrName}</Text>
                <Text style={styles.addressLine}>{addr.address_1}</Text>
                <Text style={styles.addressLine}>{addr.city}, {addr.province} {addr.postal_code}</Text>
                {!!addr.phone && <Text style={[styles.addressLine, styles.addressPhone]}>{addr.phone}</Text>}
              </View>
            </View>
          )}

          <View style={styles.card}>
            <View style={[styles.cardHeaderRow, styles.cardHeaderTinted]}>
              <View style={styles.iconAvatar}>
                <ShoppingBagIcon size={15} color={ds.primaryInk} />
              </View>
              <Text style={styles.cardHeaderTitle}>Order Items</Text>
            </View>
            <View style={styles.itemsBody}>
              {order.items.map((it) => (
                <View key={it.id} style={styles.itemRow}>
                  {it.thumbnail ? (
                    <View style={styles.itemThumbWrap}>
                      <Image source={{ uri: it.thumbnail }} style={styles.itemThumbImage} />
                    </View>
                  ) : (
                    <View style={styles.itemThumb} />
                  )}
                  <Text style={styles.itemName} numberOfLines={2}>{it.product_title}</Text>
                  <View style={styles.itemAmounts}>
                    <Text style={styles.itemQty}>Qty: {it.quantity}</Text>
                    <Text style={styles.itemPrice}>{money(it.unit_price)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
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
  roundButton: { flexShrink: 0, width: 32, height: 32, borderRadius: dsRadii.button, backgroundColor: ds.canvas, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, minWidth: 0, ...dsType.h2 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerText: { ...dsType.body, color: ds.ink2 },
  body: { flex: 1 },
  bodyContent: { paddingBottom: dsSpacing.xl },
  banner: { backgroundColor: ds.primaryStrong, padding: dsSpacing.lg },
  bannerId: { fontFamily: dsFontFamily[700], fontSize: 22, lineHeight: 28, letterSpacing: -0.22, color: ds.surface },
  bannerDate: { fontFamily: dsFontFamily[400], fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,.8)', marginTop: 4 },
  cardsWrap: { paddingHorizontal: dsSpacing.lg, paddingBottom: dsSpacing.xl, gap: dsSpacing.md, marginTop: -dsSpacing.md },
  card: { backgroundColor: ds.surface, borderRadius: dsRadii.button, overflow: 'hidden', ...dsElevation.e1 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: dsSpacing.sm, padding: dsSpacing.md },
  cardHeaderTinted: { backgroundColor: ds.primarySoft },
  iconAvatar: { flexShrink: 0, width: 32, height: 32, borderRadius: dsRadii.pill, backgroundColor: ds.primarySoft, alignItems: 'center', justifyContent: 'center' },
  cardHeaderTitle: { fontFamily: dsFontFamily[700], fontSize: 16, lineHeight: 22, letterSpacing: -0.16, color: ds.ink },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: dsSpacing.md, gap: dsSpacing.md },
  summaryCell: { width: '46%', flexGrow: 1 },
  summaryLabel: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink2 },
  summaryValue: { fontFamily: dsFontFamily[700], fontSize: 15, lineHeight: 20, color: ds.ink, marginTop: 4 },
  statusStrip: { margin: dsSpacing.md, marginTop: dsSpacing.md, borderRadius: dsRadii.input, paddingVertical: 10, paddingHorizontal: dsSpacing.md, alignItems: 'center' },
  statusStripText: { fontFamily: dsFontFamily[600], fontSize: 13, lineHeight: 18 },
  addressBody: { padding: dsSpacing.md },
  addressName: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink },
  addressLine: { fontFamily: dsFontFamily[400], fontSize: 13, lineHeight: 20, color: ds.ink2, marginTop: 4 },
  addressPhone: { marginTop: 4 },
  itemsBody: { padding: dsSpacing.md, gap: dsSpacing.md },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: dsSpacing.md },
  itemThumb: { flexShrink: 0, width: 56, height: 56, borderRadius: dsRadii.input, backgroundColor: ds.primarySoft },
  itemThumbWrap: { flexShrink: 0, width: 56, height: 56, borderRadius: dsRadii.input, backgroundColor: ds.primarySoft, overflow: 'hidden' },
  itemThumbImage: { width: '100%', height: '100%' },
  itemName: { flex: 1, minWidth: 0, fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink },
  itemAmounts: { flexShrink: 0, alignItems: 'flex-end' },
  itemQty: { fontFamily: dsFontFamily[600], fontSize: 11, lineHeight: 14, color: ds.ink, backgroundColor: ds.canvas, paddingHorizontal: dsSpacing.sm, paddingVertical: 4, borderRadius: 6 },
  itemPrice: { fontFamily: dsFontFamily[700], fontSize: 14, lineHeight: 20, color: ds.ink, marginTop: 6 },
});
