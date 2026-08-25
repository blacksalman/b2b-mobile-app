import { useEffect, useState } from 'react';
import { fetchOrders, fetchProductsByIds, type MedusaProduct } from '@/lib/medusaClient';

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
        // no ordering guarantee) - a product removed from the catalog since it was ordered is
        // simply absent from `products` and silently drops out here, never shown as a gap.
        const ordered = ids.map((id) => byId.get(id)).filter((p): p is MedusaProduct => !!p);

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
