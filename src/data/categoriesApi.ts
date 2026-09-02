import { useEffect, useRef, useState } from 'react';
import { searchProducts, fetchProductsByIds, fetchCollections, fetchCategorySections, type MedusaProduct, type MedusaCollection } from '@/lib/medusaClient';

export interface MedusaProductCategory {
  id: string;
  name: string;
  handle: string;
}

// The chip rail on the Categories screen shows the admin-curated "category page" Category
// Section (Operations > Category Sections in admin, slug "category-page") instead of every
// top-level category in the catalog - this store has 84 total categories (13 top-level), which
// read as clutter with no way to hide the ones that don't belong on this screen. Same mechanism
// Home's own category rails already use (fetchCategorySections), just a different slug.
async function fetchProductCategories(): Promise<{ product_categories: MedusaProductCategory[] }> {
  const { category_sections } = await fetchCategorySections('category-page');
  return { product_categories: category_sections[0]?.categories ?? [] };
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
  // Filter-sheet Concern/Product form/Key ingredient selections - unlike brand these are used
  // as-is (they're already real metadata values, not names needing resolution to another id).
  concerns: string[];
  forms: string[];
  ingredients: string[];
}

export interface CategoryProductsState {
  loading: boolean;
  // True only while fetching a NEXT page (loadMore) - `loading` above stays false during this,
  // so the existing grid stays on screen with a footer spinner instead of being replaced.
  loadingMore: boolean;
  error: boolean;
  results: MedusaProduct[];
  count: number;
  // Whether another page exists beyond `results` - drives whether the screen's onEndReached
  // should call loadMore at all.
  hasMore: boolean;
  loadMore: () => void;
}

const EMPTY_STATE = { loading: false, loadingMore: false, error: false, results: [] as MedusaProduct[], count: 0, hasMore: false };
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
// Real pagination: PAGE_LIMIT products per page, more pages fetched via loadMore() (called from
// the screen's FlatList onEndReached) rather than ever fetching the whole catalog at once - a
// category can have thousands of products (e.g. this catalog's largest category has 7000+), so
// "browse everything, but only what's actually been scrolled to" is the point, not "fetch it all
// upfront".
//
// Out-of-stock exclusion is BROWSING-only, not search-wide: `inStock` is only forced on when
// there's no text query. Searching for a specific product by name should still surface it (and
// show it's out of stock) rather than have it silently vanish from results - only the
// no-query/browse-a-category path hides out-of-stock items entirely.
export function useCategoryProducts(
  categoryId: string | null,
  query: string,
  filters: CategoryFilters,
  enabled: boolean = true
): CategoryProductsState {
  const [state, setState] = useState(EMPTY_STATE);
  const requestId = useRef(0);
  const offsetRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const { sort, price, avail, brandCollectionIds, concerns, forms, ingredients } = filters;
  const trimmed = query.trim();
  const hasQuery = trimmed.length > 0;
  const priceRange = PRICE_RANGES[price];

  const baseFetchArgs = {
    q: trimmed || undefined,
    categoryId: categoryId ?? undefined,
    collectionId: brandCollectionIds.length ? brandCollectionIds.join(',') : undefined,
    concerns: concerns.length ? concerns : undefined,
    forms: forms.length ? forms : undefined,
    ingredients: ingredients.length ? ingredients : undefined,
    sort: SORT_MAP[sort],
    minPrice: priceRange?.min,
    maxPrice: priceRange?.max,
    inStock: !hasQuery,
    limit: PAGE_LIMIT,
  };

  useEffect(() => {
    if (!enabled) {
      setState(EMPTY_STATE);
      return;
    }

    const myRequestId = ++requestId.current;
    offsetRef.current = 0;
    // Clears `results` immediately (not just a spread-over-prev) - otherwise switching
    // category/collection (e.g. Listing's brand cards) kept showing the PREVIOUS selection's
    // products for the whole fetch, which read as "wrong brand" rather than "loading". `count`
    // deliberately keeps its previous value here rather than also resetting to 0 - it only feeds
    // the filter sheet's result number, which otherwise flashed to 0 on every fetch before
    // settling on the real count; screens showing an item count of their own gate that on
    // `loading` directly instead of trusting this value while a fetch is in flight (see
    // listing.tsx).
    setState((prev) => ({ ...EMPTY_STATE, loading: true, count: prev.count }));

    const timeout = setTimeout(
      async () => {
        try {
          const { ids, count } = await searchProducts({ ...baseFetchArgs, offset: 0 });
          const hydrated = await fetchProductsByIds(ids);
          const byId = new Map(hydrated.map((p) => [p.id, p] as const));
          const ordered = ids.map((id) => byId.get(id)).filter((p): p is MedusaProduct => !!p);

          if (myRequestId === requestId.current) {
            offsetRef.current = ordered.length;
            setState({ loading: false, loadingMore: false, error: false, results: ordered, count, hasMore: ordered.length < count });
          }
        } catch {
          if (myRequestId === requestId.current) {
            setState({ ...EMPTY_STATE, error: true });
          }
        }
      },
      trimmed ? DEBOUNCE_MS : 0
    );

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, categoryId, query, sort, price, avail, brandCollectionIds, concerns, forms, ingredients]);

  const loadMore = () => {
    if (!enabled || loadingMoreRef.current || state.loading || !state.hasMore) return;
    loadingMoreRef.current = true;
    const myRequestId = requestId.current;
    setState((prev) => ({ ...prev, loadingMore: true }));

    (async () => {
      try {
        const { ids, count } = await searchProducts({ ...baseFetchArgs, offset: offsetRef.current });
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
        // A failed "load more" just stops there - the products already on screen stay put,
        // no need to blow away the whole grid over one page failing.
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
