import { useEffect, useRef, useState } from 'react';
import { storeFetch, searchProducts, fetchProductsByIds, fetchCollections, type MedusaProduct, type MedusaCollection } from '@/lib/medusaClient';

export interface MedusaProductCategory {
  id: string;
  name: string;
  handle: string;
}

function fetchProductCategories(): Promise<{ product_categories: MedusaProductCategory[] }> {
  // Top-level only (parent_category_id=null) - matches what Medusa Admin's category list shows
  // by default (13 of this catalog's 84 total categories; the other 71 are children nested
  // under these). Flattening in the other 71 read as clutter with no hierarchy shown - can add
  // drill-down into a category's children later if that's wanted.
  return storeFetch('/store/product-categories', {
    limit: '100',
    fields: 'id,name,handle',
    parent_category_id: 'null',
  });
}

// The real category list for the Categories screen's chip rail - native Medusa store route
// (no custom backend code, same "no override" situation as /store/products//store/collections).
export function useProductCategories(): MedusaProductCategory[] {
  const [categories, setCategories] = useState<MedusaProductCategory[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchProductCategories()
      .then((d) => {
        if (!cancelled) setCategories(d.product_categories);
      })
      .catch(() => {
        // Category rail just stays empty (only the "All" chip shows) - not worth surfacing.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return categories;
}

// Real collections (AYURVEDA ONE PVT LTD. / AYUR VIBES) - backs the filter sheet's "Brand"
// section, replacing its old mock brandOptions (fake names computed from the mock catalog).
export function useCollections(): MedusaCollection[] {
  const [collections, setCollections] = useState<MedusaCollection[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchCollections()
      .then((d) => {
        if (!cancelled) setCollections(d.collections);
      })
      .catch(() => {
        // Brand filter section just stays empty - not worth surfacing.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return collections;
}

// Maps the filter sheet's mock-era sort/price labels onto what GET /store/products-search
// actually supports. "Popular" has no real equivalent (no sales-rank/popularity data anywhere
// in the backend) - stays unmapped, meaning "no explicit sort", same as leaving it off entirely.
const SORT_MAP: Record<string, 'price_asc' | 'price_desc' | 'newest' | undefined> = {
  Popular: undefined,
  'Price: Low to High': 'price_asc',
  'Price: High to Low': 'price_desc',
  Newest: 'newest',
};

const PRICE_RANGES: Record<string, { min?: number; max?: number }> = {
  'Under ₹200': { max: 200 },
  '₹200–₹500': { min: 200, max: 500 },
  '₹500–₹1000': { min: 500, max: 1000 },
  'Above ₹1000': { min: 1000 },
};

export interface CategoryFilters {
  sort: string;
  price: string;
  avail: string[];
  // Already resolved from filter-sheet brand NAMES to real collection ids by the caller
  // (categories.tsx) - this hook stays agnostic of how brand names map to collections.
  brandCollectionIds: string[];
}

export interface CategoryProductsState {
  loading: boolean;
  error: boolean;
  results: MedusaProduct[];
  count: number;
}

const EMPTY: CategoryProductsState = { loading: false, error: false, results: [], count: 0 };
const DEBOUNCE_MS = 350;
const PAGE_LIMIT = 40;

// Backs the Categories screen's product grid: browse-by-category and/or search-within-category,
// both via GET /store/products-search (categoryId and query compose - both can be set at once).
// Unlike Search (searchApi.ts), this always fetches by default - including with categoryId=null
// and no query, which browses the full catalogue - since Categories should show *something* by
// default, not just an empty state waiting for input. Same two-step pattern as searchApi.ts:
// get the filtered/ranked id list, then hydrate full price/collection/category data via
// fetchProductsByIds, re-ordering the hydrated set back to match.
//
// `enabled` (default true) lets a caller that only sometimes wants real data - Listing screen's
// collectionId (Brand cards) path, alongside its still-mock ids-based path for everything else -
// skip fetching entirely rather than wastefully browsing the full catalogue on every mock-path
// visit.
//
// No pagination yet - always the first PAGE_LIMIT products for the current category/query/
// filters. Fine for now (this is the first cut of this screen); a real "load more" is
// follow-up work if browsing a huge category turns out to need it.
export function useCategoryProducts(
  categoryId: string | null,
  query: string,
  filters: CategoryFilters,
  enabled: boolean = true
): CategoryProductsState {
  const [state, setState] = useState<CategoryProductsState>(EMPTY);
  const requestId = useRef(0);
  const { sort, price, avail, brandCollectionIds } = filters;

  useEffect(() => {
    if (!enabled) {
      setState(EMPTY);
      return;
    }

    const trimmed = query.trim();
    const myRequestId = ++requestId.current;
    // Clears `results` immediately (not just a spread-over-prev) - otherwise switching
    // category/collection (e.g. Listing's brand cards) kept showing the PREVIOUS selection's
    // products for the whole fetch, which read as "wrong brand" rather than "loading". `count`
    // deliberately keeps its previous value here rather than also resetting to 0 - it only feeds
    // the filter sheet's result number, which otherwise flashed to 0 on every fetch before
    // settling on the real count; screens showing an item count of their own gate that on
    // `loading` directly instead of trusting this value while a fetch is in flight (see
    // listing.tsx).
    setState((prev) => ({ loading: true, error: false, results: [], count: prev.count }));

    const priceRange = PRICE_RANGES[price];

    const timeout = setTimeout(
      async () => {
        try {
          const { ids, count } = await searchProducts({
            q: trimmed || undefined,
            categoryId: categoryId ?? undefined,
            collectionId: brandCollectionIds.length ? brandCollectionIds.join(',') : undefined,
            sort: SORT_MAP[sort],
            minPrice: priceRange?.min,
            maxPrice: priceRange?.max,
            inStock: avail.includes('In stock only'),
            limit: PAGE_LIMIT,
          });
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
      },
      trimmed ? DEBOUNCE_MS : 0
    );

    return () => clearTimeout(timeout);
  }, [enabled, categoryId, query, sort, price, avail, brandCollectionIds]);

  return state;
}
