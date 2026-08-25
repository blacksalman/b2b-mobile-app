import { useEffect, useRef, useState } from 'react';
import { searchProducts, fetchProductsByIds, type MedusaProduct } from '@/lib/medusaClient';

export interface SearchState {
  loading: boolean;
  error: boolean;
  results: MedusaProduct[];
  count: number;
}

const EMPTY: SearchState = { loading: false, error: false, results: [], count: 0 };
const DEBOUNCE_MS = 350;

// Backs the Search screen against the backend's real full-catalog search
// (/store/products-search) instead of the mock catalog's substring filter. Two-step, same
// pattern as homeApi.ts: get the relevance-ranked id list from products-search, then hydrate
// full price/collection/category data via fetchProductsByIds - and re-order the hydrated
// results back into that ranking, since the native product-list endpoint used for hydration
// doesn't preserve id[] filter order on its own.
export function useProductSearch(query: string): SearchState {
  const [state, setState] = useState<SearchState>(EMPTY);
  const requestId = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setState(EMPTY);
      return;
    }

    const myRequestId = ++requestId.current;
    setState((prev) => ({ ...prev, loading: true, error: false }));

    const timeout = setTimeout(async () => {
      try {
        const { ids, count } = await searchProducts({ q: trimmed });
        const hydrated = await fetchProductsByIds(ids);
        const byId = new Map(hydrated.map((p) => [p.id, p] as const));
        const ordered = ids.map((id) => byId.get(id)).filter((p): p is MedusaProduct => !!p);

        if (myRequestId === requestId.current) {
          setState({ loading: false, error: false, results: ordered, count });
        }
      } catch {
        if (myRequestId === requestId.current) {
          setState({ loading: false, error: true, results: [], count: 0 });
        }
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [query]);

  return state;
}
