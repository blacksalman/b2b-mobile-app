import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ds, dsElevation, dsFontFamily, dsRadii, dsSpacing, dsType } from '@/theme';
import { LocationPinIcon, OrderBoxIcon, ShoppingBagIcon, SmallBackChevronIcon } from '@/icons';
import { findOrder, orderItemCount, orderTotalLabel, ORDER_STATUS_STYLE } from '@/data/orders-content';
import { money } from '@/utils/money';

// Built against the new AyurvedaOne design system (screen_OrderDetail.html, isOrderDetail block) —
// net-new screen, nested under `orders/[id]` following the same precedent as
// `product/[id]/reviews.tsx`. Ported verbatim from the `orderDetail` renderVals() builder (source
// lines 2657-2661, fully in range). The back button always routes to the Orders list (`goOrders`),
// not a generic back — matches the source's `onClick="{{ goOrders }}"` exactly, same category of
// fixed-destination back button as Reviews' back-to-Home quirk from an earlier round.
export default function OrderDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const order = findOrder(Number(id));
  const statusStyle = ORDER_STATUS_STYLE[order.status];
  const goOrders = () => router.push('/orders');

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
          <Text style={styles.bannerId}>#{order.id}</Text>
          <Text style={styles.bannerDate}>Order Date: {order.dateFull}</Text>
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
                <Text style={styles.summaryValue}>{orderTotalLabel(order)}</Text>
              </View>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryLabel}>Dispatch Date</Text>
                <Text style={styles.summaryValue}>{order.dispatch}</Text>
              </View>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryLabel}>Delivery Date</Text>
                <Text style={styles.summaryValue}>{order.delivery}</Text>
              </View>
            </View>
            <View style={[styles.statusStrip, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusStripText, { color: statusStyle.color }]}>Order Status: {order.status}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={[styles.cardHeaderRow, styles.cardHeaderTinted]}>
              <View style={styles.iconAvatar}>
                <LocationPinIcon size={15} color={ds.primaryInk} strokeWidth={1.7} />
              </View>
              <Text style={styles.cardHeaderTitle}>Delivery Address</Text>
            </View>
            <View style={styles.addressBody}>
              <Text style={styles.addressName}>{order.addr.name}</Text>
              <Text style={styles.addressLine}>{order.addr.line}</Text>
              <Text style={styles.addressLine}>{order.addr.cityState}</Text>
              <Text style={[styles.addressLine, styles.addressPhone]}>{order.addr.phone}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={[styles.cardHeaderRow, styles.cardHeaderTinted]}>
              <View style={styles.iconAvatar}>
                <ShoppingBagIcon size={15} color={ds.primaryInk} />
              </View>
              <Text style={styles.cardHeaderTitle}>Order Items</Text>
            </View>
            <View style={styles.itemsBody}>
              {order.items.map((it, i) => (
                <View key={i} style={styles.itemRow}>
                  <View style={[styles.itemThumb, { backgroundColor: it.tint }]} />
                  <Text style={styles.itemName} numberOfLines={2}>{it.name}</Text>
                  <View style={styles.itemAmounts}>
                    <Text style={styles.itemQty}>Qty: {it.qty}</Text>
                    <Text style={styles.itemPrice}>{money(it.price)}</Text>
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
  itemThumb: { flexShrink: 0, width: 56, height: 56, borderRadius: dsRadii.input },
  itemName: { flex: 1, minWidth: 0, fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink },
  itemAmounts: { flexShrink: 0, alignItems: 'flex-end' },
  itemQty: { fontFamily: dsFontFamily[600], fontSize: 11, lineHeight: 14, color: ds.ink, backgroundColor: ds.canvas, paddingHorizontal: dsSpacing.sm, paddingVertical: 4, borderRadius: 6 },
  itemPrice: { fontFamily: dsFontFamily[700], fontSize: 14, lineHeight: 20, color: ds.ink, marginTop: 6 },
});
