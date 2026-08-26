import { useEffect, useState } from 'react';
import { storeFetch, storeMutateExpectingError } from '@/lib/medusaClient';

// Real reviews (apps/backend's `review` module, src/modules/review) - replaces the fixed mock
// rating/reviewCount (decorateProduct.ts's ratingOf/reviewCountOf) and the hardcoded
// reviewsSummary/reviewList (product-detail-content.ts) everywhere a real (API-backed) product's
// rating/reviews show up: product cards (homeApi.ts's toRailProduct), the product detail page's
// rating pill + Reviews tab preview, and the dedicated Reviews screen (write + full list).

export interface ReviewSummary {
  average: number;
  count: number;
}
export type ReviewSummaryMap = Record<string, ReviewSummary>;

const EMPTY_SUMMARY: ReviewSummary = { average: 0, count: 0 };
export function summaryFor(map: ReviewSummaryMap, productId: string | undefined): ReviewSummary {
  return (productId && map[productId]) || EMPTY_SUMMARY;
}

// Batch aggregate for many product cards at once (Home rails, Search results, Listing/
// Categories grids, product detail's similar/also-bought shelves) - one request per screen
// instead of one per card. `productIds` should be real Medusa product ids (product.medusaId);
// dedup/order doesn't matter, only the resulting id SET does, so the effect only re-fetches when
// that set actually changes, not on every render.
export function useReviewSummaries(productIds: string[]): ReviewSummaryMap {
  const key = [...new Set(productIds)].sort().join(',');
  const [summaries, setSummaries] = useState<ReviewSummaryMap>({});

  useEffect(() => {
    if (!key) {
      setSummaries({});
      return;
    }
    let cancelled = false;
    storeFetch<{ summaries: ReviewSummaryMap }>('/store/reviews/summary', { product_ids: key })
      .then((data) => {
        if (!cancelled) setSummaries(data.summaries);
      })
      .catch(() => {
        if (!cancelled) setSummaries({});
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return summaries;
}

export interface StoreReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  customer_name: string;
  customer_initials: string;
}

export interface RatingBreakdownRow {
  star: number;
  count: number;
  pct: number;
}

interface ProductReviewsState {
  loading: boolean;
  reviews: StoreReview[];
  count: number;
  average: number;
  ratingCount: number;
  breakdown: RatingBreakdownRow[];
}

const EMPTY_REVIEWS_STATE: ProductReviewsState = {
  loading: true,
  reviews: [],
  count: 0,
  average: 0,
  ratingCount: 0,
  breakdown: [5, 4, 3, 2, 1].map((star) => ({ star, count: 0, pct: 0 })),
};

// Approved reviews for one product (GET /store/reviews) - backs both the product detail page's
// 2-item Reviews-tab preview and the dedicated Reviews screen's full list, just called with a
// different `limit`. `productId` null (mock-catalog product, no real backend id - see
// idHash.ts's own comment on ids 1-10) skips the fetch entirely and stays at the empty state,
// same "no real data to show" convention every other real-data hook in this app already follows
// rather than fabricating placeholder reviews for a product that has no real ones.
export function useProductReviews(productId: string | null, limit = 10): ProductReviewsState & { refetch: () => void } {
  const [state, setState] = useState<ProductReviewsState>(EMPTY_REVIEWS_STATE);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!productId) {
      setState({ ...EMPTY_REVIEWS_STATE, loading: false });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    storeFetch<{
      reviews: StoreReview[];
      count: number;
      average: number;
      ratingCount: number;
      breakdown: RatingBreakdownRow[];
    }>('/store/reviews', { product_id: productId, limit: String(limit) })
      .then((data) => {
        if (cancelled) return;
        setState({
          loading: false,
          reviews: data.reviews,
          count: data.count,
          average: data.average,
          ratingCount: data.ratingCount,
          breakdown: data.breakdown,
        });
      })
      .catch(() => {
        if (!cancelled) setState({ ...EMPTY_REVIEWS_STATE, loading: false });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, limit, tick]);

  return { ...state, refetch: () => setTick((t) => t + 1) };
}

export type SubmitReviewResult = { ok: true } | { ok: false; message: string };

// Requires login (see middlewares.ts's "/store/reviews" POST entry) and that the customer's own
// order history actually contains this product - both enforced server-side, not just assumed
// here, so the real failure messages ("you can only review products you've purchased" / "you've
// already reviewed this product") come straight from the backend rather than being guessed at
// client-side.
export async function submitReview(input: { product_id: string; rating: number; comment?: string }): Promise<SubmitReviewResult> {
  const { ok, data } = await storeMutateExpectingError<{ message?: string }>('/store/reviews', 'POST', input);
  if (ok) return { ok: true };
  return { ok: false, message: data?.message || 'Could not submit your review. Please try again.' };
}
