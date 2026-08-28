import { useEffect, useRef, useState } from 'react';
import { searchProducts, fetchProductsByIds, type MedusaProduct } from '@/lib/medusaClient';

export interface SearchState {
  loading: boolean;
  // True only while fetching a NEXT page (loadMore) - `loading` stays false during this, so the
  // existing grid stays on screen with a footer spinner instead of being replaced (same
  // convention as categoriesApi.ts's useCategoryProducts).
  loadingMore: boolean;
  error: boolean;
  results: MedusaProduct[];
  count: number;
  hasMore: boolean;
  loadMore: () => void;
}

const EMPTY: SearchState = { loading: false, loadingMore: false, error: false, results: [], count: 0, hasMore: false, loadMore: () => {} };
const DEBOUNCE_MS = 350;
const PAGE_LIMIT = 24;

// Backs the Search screen against the backend's real full-catalog search
// (/store/products-search) instead of the mock catalog's substring filter. Two-step, same
// pattern as homeApi.ts: get the relevance-ranked id list from products-search, then hydrate
// full price/collection/category data via fetchProductsByIds - and re-order the hydrated
// results back into that ranking, since the native product-list endpoint used for hydration
// doesn't preserve id[] filter order on its own.
//
// Real pagination (PAGE_LIMIT per page, more via loadMore()) rather than ever fetching every
// match at once - same reasoning as categoriesApi.ts's useCategoryProducts: a common term can
// match hundreds of products across this ~10k-catalog, so "only fetch what's actually been
// scrolled to" matters here too, not just for category browsing.
//
// The products-search route's own text-search path was, until recently, a genuine multi-second
// bottleneck independent of anything this hook does (confirmed live: 9.2s for a common term like
// "card" against this catalog) - now fixed backend-side (a real SQL/Knex path replacing an
// in-memory query.graph candidate pass, plus a trigram index that was completely missing before).
// This hook's own job is just to not add further avoidable delay on top of that: real pagination,
// and a stale-response guard so a fast keystroke never gets clobbered by a slower one that started
// earlier.
export function useProductSearch(query: string): SearchState {
  const [state, setState] = useState<Omit<SearchState, 'loadMore'>>(EMPTY);
  const requestId = useRef(0);
  const offsetRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const trimmed = query.trim();

  useEffect(() => {
    if (!trimmed) {
      setState(EMPTY);
      return;
    }

    const myRequestId = ++requestId.current;
    offsetRef.current = 0;
    setState((prev) => ({ ...EMPTY, loading: true, count: prev.count }));

    const timeout = setTimeout(async () => {
      try {
        const { ids, count } = await searchProducts({ q: trimmed, limit: PAGE_LIMIT, offset: 0 });
        const hydrated = await fetchProductsByIds(ids);
        const byId = new Map(hydrated.map((p) => [p.id, p] as const));
        const ordered = ids.map((id) => byId.get(id)).filter((p): p is MedusaProduct => !!p);

        if (myRequestId === requestId.current) {
          offsetRef.current = ordered.length;
          setState({ loading: false, loadingMore: false, error: false, results: ordered, count, hasMore: ordered.length < count });
        }
      } catch {
        if (myRequestId === requestId.current) {
          setState({ ...EMPTY, error: true });
        }
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [trimmed]);

  const loadMore = () => {
    if (!trimmed || loadingMoreRef.current || state.loading || !state.hasMore) return;
    loadingMoreRef.current = true;
    const myRequestId = requestId.current;
    setState((prev) => ({ ...prev, loadingMore: true }));

    (async () => {
      try {
        const { ids, count } = await searchProducts({ q: trimmed, limit: PAGE_LIMIT, offset: offsetRef.current });
        const hydrated = await fetchProductsByIds(ids);
        const byId = new Map(hydrated.map((p) => [p.id, p] as const));
        const ordered = ids.map((id) => byId.get(id)).filter((p): p is MedusaProduct => !!p);

        if (myRequestId === requestId.current) {
          offsetRef.current += ordered.length;
          setState((prev) => {
            const results = [...prev.results, ...ordered];
            return { loading: false, loadingMore: false, error: false, results, count, hasMore: results.length < count };
          });
        }
      } catch {
        // A failed "load more" just stops there - the products already on screen stay put, no
        // need to blow away the whole grid over one page failing.
        if (myRequestId === requestId.current) {
          setState((prev) => ({ ...prev, loadingMore: false }));
        }
      } finally {
        loadingMoreRef.current = false;
      }
    })();
  };

  return { ...state, loadMore };
}
