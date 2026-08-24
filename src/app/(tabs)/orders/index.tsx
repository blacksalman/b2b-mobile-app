import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ds, dsElevation, dsFontFamily, dsRadii, dsSpacing, dsType } from '@/theme';
import { SmallBackChevronIcon, SmallForwardChevronIcon } from '@/icons';
import { ORDERS, ORDER_STATUS_STYLE, ORDER_TAB_NAMES, orderTotalLabel, type OrderStatus } from '@/data/orders-content';

// Built against the new AyurvedaOne design system (screen_Orders.html, isOrders block) — Account's
// "My Orders" tile previously linked to a `StubScreen` placeholder; this is a first build, not a
// restyle. Ported verbatim from `orderTabs`/`filteredOrders`/`ordersEmpty` (source lines 2649-2656,
// fully in range, well before this project's known 256KB truncation point).
export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<OrderStatus>('Confirmed');

  const filteredOrders = useMemo(() => ORDERS.filter((o) => o.status === tab), [tab]);
  const ordersEmpty = filteredOrders.length === 0;

  const goAccount = () => router.push('/account');
  const openOrder = (id: number) => router.push(`/orders/${id}`);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + dsSpacing.md }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={goAccount} style={styles.roundButton} hitSlop={4}>
            <SmallBackChevronIcon size={9} color={ds.ink} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>My Orders</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          {ORDER_TAB_NAMES.map((t) => {
            const on = tab === t;
            return (
              <Pressable key={t} onPress={() => setTab(t)} style={[styles.tabChip, { backgroundColor: on ? ds.primaryStrong : ds.canvas }]}>
                <Text style={[styles.tabChipText, { color: on ? ds.surface : ds.ink2 }]}>{t}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {ordersEmpty ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No orders here yet</Text>
            <Text style={styles.emptyBody}>Orders in this stage will show up here.</Text>
          </View>
        ) : (
          filteredOrders.map((o) => {
            const statusStyle = ORDER_STATUS_STYLE[o.status];
            return (
              <Pressable key={o.id} onPress={() => openOrder(o.id)} style={styles.orderCard}>
                <View style={styles.orderCardTop}>
                  <View style={styles.orderCardIds}>
                    <Text style={styles.orderId}>Order #{o.id}</Text>
                    <Text style={styles.orderDate}>Order Date: {o.date}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusStyle.color }]}>{o.status}</Text>
                  </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.orderCardBottom}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalValue}>{orderTotalLabel(o)}</Text>
                  <SmallForwardChevronIcon size={8} color={ds.ink2} />
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ds.canvas },
  header: { flexShrink: 0, backgroundColor: ds.surface, borderBottomWidth: 1, borderBottomColor: ds.line },
  headerRow: { paddingHorizontal: dsSpacing.lg, paddingBottom: dsSpacing.md, flexDirection: 'row', alignItems: 'center', gap: dsSpacing.md },
  roundButton: { flexShrink: 0, width: 32, height: 32, borderRadius: dsRadii.button, backgroundColor: ds.canvas, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, minWidth: 0, ...dsType.h2 },
  tabsRow: { flexDirection: 'row', gap: dsSpacing.sm, paddingHorizontal: dsSpacing.lg, paddingBottom: dsSpacing.md },
  tabChip: { flexShrink: 0, height: 36, paddingHorizontal: dsSpacing.md, borderRadius: dsRadii.pill, alignItems: 'center', justifyContent: 'center' },
  tabChipText: { fontFamily: dsFontFamily[600], fontSize: 13, lineHeight: 18 },
  body: { flex: 1 },
  bodyContent: { padding: dsSpacing.lg, paddingBottom: dsSpacing.xl, gap: dsSpacing.md },
  emptyState: { paddingTop: dsSpacing.xl + dsSpacing.lg, alignItems: 'center' },
  emptyTitle: { fontFamily: dsFontFamily[600], fontSize: 16, lineHeight: 22, letterSpacing: -0.16, color: ds.ink },
  emptyBody: { fontFamily: dsFontFamily[400], fontSize: 14, lineHeight: 21, color: ds.ink2, marginTop: 4 },
  orderCard: { backgroundColor: ds.surface, borderWidth: 1, borderColor: ds.line, borderRadius: dsRadii.button, padding: dsSpacing.md, ...dsElevation.e1 },
  orderCardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: dsSpacing.sm },
  orderCardIds: { flexShrink: 1 },
  orderId: { fontFamily: dsFontFamily[700], fontSize: 16, lineHeight: 22, letterSpacing: -0.16, color: ds.ink },
  orderDate: { fontFamily: dsFontFamily[400], fontSize: 13, lineHeight: 19, color: ds.ink2, marginTop: 4 },
  statusBadge: { flexShrink: 0, paddingHorizontal: 10, paddingVertical: 4, borderRadius: dsRadii.pill },
  statusBadgeText: { fontFamily: dsFontFamily[600], fontSize: 11, lineHeight: 14 },
  divider: { height: 1, backgroundColor: ds.line, marginVertical: dsSpacing.md },
  orderCardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: dsSpacing.sm },
  totalLabel: { fontFamily: dsFontFamily[400], fontSize: 13, lineHeight: 19, color: ds.ink2 },
  totalValue: { fontFamily: dsFontFamily[700], fontSize: 15, lineHeight: 20, color: ds.ink },
});
