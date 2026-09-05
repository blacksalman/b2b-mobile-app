import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { fetchOrders, fetchOrder, fetchProductsByIds, type MedusaOrder, type MedusaProduct } from '@/lib/medusaClient';
import { isProductInStock } from './homeApi';

// Real "Buy again" data source (GET /store/orders, auto-scoped to the logged-in customer via the
// bearer token - see authToken.ts). Deliberately re-fetches CURRENT product data (price, images,
// handle) via fetchProductsByIds rather than building cards straight from the order's own line
// items - an order line item only has the title/thumbnail/price as they were AT ORDER TIME, and a
// "buy again" reorder should show what it costs today, plus needs a live variant id for the
// add/inc/dec actions and a handle for routing - none of which an order line item carries. This
// is the same two-step id-then-hydrate pattern homeApi.ts already uses for product-sections.
export interface BuyAgainData {
  loading: boolean;
  products: MedusaProduct[];
}

const MAX_PRODUCTS = 10;
// Recent orders scanned to find MAX_PRODUCTS distinct products - generous enough that a customer
// with repeat orders of the same few SKUs still surfaces a full 10 without paging through their
// whole history, without scanning unbounded order counts either.
const ORDER_SCAN_LIMIT = 20;

const EMPTY: BuyAgainData = { loading: false, products: [] };

export function useBuyAgainProducts(loggedIn: boolean): BuyAgainData {
  const [data, setData] = useState<BuyAgainData>(loggedIn ? { loading: true, products: [] } : EMPTY);

  useEffect(() => {
    if (!loggedIn) {
      setData(EMPTY);
      return;
    }

    let cancelled = false;
    setData((prev) => ({ ...prev, loading: true }));

    (async () => {
      try {
        const { orders } = await fetchOrders({ limit: ORDER_SCAN_LIMIT });
        const sorted = [...orders].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        const seen = new Set<string>();
        const ids: string[] = [];
        outer: for (const order of sorted) {
          for (const item of order.items) {
            if (!item.product_id || seen.has(item.product_id)) continue;
            seen.add(item.product_id);
            ids.push(item.product_id);
            if (ids.length >= MAX_PRODUCTS) break outer;
          }
        }

        if (!ids.length) {
          if (!cancelled) setData(EMPTY);
          return;
        }

        const products = await fetchProductsByIds(ids);
        const byId = new Map(products.map((p) => [p.id, p] as const));
        // Re-sorted to the original most-recently-ordered-first order (fetchProductsByIds makes
        // no ordering guarantee) - a product removed from the catalog since it was ordered, OR
        // now completely out of stock, is simply absent here and silently drops out, never shown
        // as a gap (same reasoning as the catalog-removal case - a "buy again" that can't
        // actually be bought again isn't useful to show).
        const ordered = ids
          .map((id) => byId.get(id))
          .filter((p): p is MedusaProduct => !!p && isProductInStock(p));

        if (!cancelled) setData({ loading: false, products: ordered });
      } catch {
        if (!cancelled) setData(EMPTY);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loggedIn]);

  return data;
}

// Real "My Orders" data source (list + detail) - replaces the old orders-content.ts mock
// (ORDERS/findOrder/ordersByStatus), which never touched the backend at all.
export type OrderStatus = 'Confirmed' | 'In Transit' | 'Delivered' | 'Cancelled';
export const ORDER_TAB_NAMES: OrderStatus[] = ['Confirmed', 'In Transit', 'Delivered', 'Cancelled'];

// Same hex values the old mock used for Confirmed/In Transit/Delivered (ds.primaryInk/
// ds.primarySoft, ds.warningInk/ds.warning) plus a matching danger-toned pair for the new
// Cancelled bucket (ds.dangerInk-equivalent), kept as a lookup by name rather than importing the
// theme here - this stays a pure data module, same convention orders-content.ts used.
export const ORDER_STATUS_STYLE: Record<OrderStatus, { color: string; bg: string }> = {
  Confirmed: { color: '#0C4733', bg: '#DCF5E9' },
  'In Transit': { color: '#7F4F0C', bg: '#FCF1E0' },
  Delivered: { color: '#0C4733', bg: '#DCF5E9' },
  Cancelled: { color: '#B3261E', bg: '#FBE7E6' },
};

// Derived from `fulfillments` directly (shipped_at/delivered_at/canceled_at), NOT a
// `fulfillment_status` field - confirmed in this backend's own source that field is unreliable
// through the Store API's query mechanism (see MedusaOrder's own comment, medusaClient.ts).
// order.status ('canceled') takes priority over fulfillment state - a canceled order shouldn't
// read as "Confirmed" just because it has no active fulfillment.
export function orderStatusFor(order: MedusaOrder): OrderStatus {
  if (order.status === 'canceled') return 'Cancelled';
  const active = order.fulfillments.filter((f) => !f.canceled_at);
  if (active.some((f) => f.delivered_at)) return 'Delivered';
  if (active.some((f) => f.shipped_at)) return 'In Transit';
  return 'Confirmed';
}

export function orderItemCount(order: MedusaOrder): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

// First active (non-canceled) fulfillment's dates - this app never splits an order across
// multiple real shipments today, so "the" dispatch/delivery date is unambiguous; a
// not-yet-fulfilled order simply has none yet.
function activeFulfillment(order: MedusaOrder): MedusaOrder['fulfillments'][number] | undefined {
  return order.fulfillments.find((f) => !f.canceled_at);
}
export function orderDispatchDate(order: MedusaOrder): string | null {
  return activeFulfillment(order)?.shipped_at ?? null;
}
export function orderDeliveryDate(order: MedusaOrder): string | null {
  return activeFulfillment(order)?.delivered_at ?? null;
}

// The delivery date the customer was promised on the order-confirmed screen, captured onto the
// order at order.placed (backend's order-delivery-estimate subscriber) rather than recomputed -
// see MedusaOrder.metadata for why recomputing drifts. Already formatted by the backend, so Order
// Details renders the identical string shown at checkout instead of re-deriving IST calendar
// formatting here and risking a different-looking date for the same day.
//
// Deliberately still returned once the date has passed: an estimate that quietly disappears reads
// as information being withheld, whereas a visibly stale estimate next to a still-undispatched
// order is the honest state of things. Only ever supplanted by a real delivered_at.
export function orderDeliveryEstimate(order: MedusaOrder): string | null {
  return order.metadata?.delivery_estimate?.formatted ?? null;
}

export interface OrdersListData {
  loading: boolean;
  error: boolean;
  orders: MedusaOrder[];
}

const ORDERS_LIST_LIMIT = 50;

// Re-fetches every time the Orders screen regains focus, not just on first mount - same reasoning
// as every other real-data list in this app (Cart, Categories, ...): a mount-only fetch would
// keep showing whatever was true the first time this screen ever opened.
export function useOrders(): OrdersListData {
  const [data, setData] = useState<OrdersListData>({ loading: true, error: false, orders: [] });

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setData((prev) => ({ ...prev, loading: true }));
      fetchOrders({ limit: ORDERS_LIST_LIMIT })
        .then(({ orders }) => {
          if (cancelled) return;
          const sorted = [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setData({ loading: false, error: false, orders: sorted });
        })
        .catch(() => {
          if (!cancelled) setData({ loading: false, error: true, orders: [] });
        });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  return data;
}

export interface OrderDetailData {
  loading: boolean;
  notFound: boolean;
  order: MedusaOrder | null;
}

const EMPTY_ORDER_DETAIL: OrderDetailData = { loading: true, notFound: false, order: null };
const NOT_FOUND_ORDER_DETAIL: OrderDetailData = { loading: false, notFound: true, order: null };

// `orderId` nullable so a caller with no real id on hand yet (shouldn't normally happen - Orders
// always routes by a real order.id) can still call this hook unconditionally, same pattern
// productDetailApi.ts's useProductDetail uses for its own nullable handle.
export function useOrder(orderId: string | null): OrderDetailData {
  const [state, setState] = useState<OrderDetailData>(EMPTY_ORDER_DETAIL);

  useEffect(() => {
    if (!orderId) {
      setState(NOT_FOUND_ORDER_DETAIL);
      return;
    }
    let cancelled = false;
    setState(EMPTY_ORDER_DETAIL);
    fetchOrder(orderId)
      .then((order) => {
        if (!cancelled) setState({ loading: false, notFound: false, order });
      })
      .catch(() => {
        if (!cancelled) setState(NOT_FOUND_ORDER_DETAIL);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  return state;
}
