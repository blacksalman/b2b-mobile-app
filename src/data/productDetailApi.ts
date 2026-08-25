import { useEffect, useState } from 'react';
import { fetchProductByHandle, fetchProductsByIds, fetchProductScheme, type MedusaProduct } from '@/lib/medusaClient';

export interface ProductDetailState {
  loading: boolean;
  // True once loading finishes with no product found for this handle (bad/stale link, or the
  // backend fetch failed).
  notFound: boolean;
  product: MedusaProduct | null;
  // Similar products ("same category") / People also bought - both from this product's
  // /scheme data, each hydrated to full product data via fetchProductsByIds. Empty when
  // that list isn't configured for this product in admin - the caller hides the rail
  // entirely rather than showing an empty section.
  similarProducts: MedusaProduct[];
  alsoBoughtProducts: MedusaProduct[];
}

const EMPTY: ProductDetailState = {
  loading: true,
  notFound: false,
  product: null,
  similarProducts: [],
  alsoBoughtProducts: [],
};
const NOT_FOUND: ProductDetailState = { loading: false, notFound: true, product: null, similarProducts: [], alsoBoughtProducts: [] };

// Backs product/[id].tsx for a real (non-mock) product - fetches directly by handle (the app's
// URL slug for a product, see idHash.ts's productHref) rather than through productRegistry, so
// opening a product detail page works on a cold load or a page refresh, not just when a card
// for it already rendered this session.
//
// `handle` is nullable so the mock-catalog path (product/[id].tsx's own productById lookup)
// can skip this fetch entirely by passing null - hooks can't be called conditionally, so the
// component always calls this, but a null handle just resolves straight to NOT_FOUND with no
// network request.
export function useProductDetail(handle: string | null): ProductDetailState {
  const [state, setState] = useState<ProductDetailState>(EMPTY);

  useEffect(() => {
    if (!handle) {
      setState(NOT_FOUND);
      return;
    }

    let cancelled = false;
    setState(EMPTY);

    async function load() {
      try {
        const product = await fetchProductByHandle(handle as string);
        if (cancelled) return;
        if (!product) {
          setState(NOT_FOUND);
          return;
        }

        const scheme = await fetchProductScheme(product.id);
        if (cancelled) return;

        const [similarProducts, alsoBoughtProducts] = await Promise.all([
          fetchProductsByIds(scheme.sameCategoryProducts.map((p) => p.id)),
          fetchProductsByIds(scheme.peopleAlsoBoughtProducts.map((p) => p.id)),
        ]);
        if (cancelled) return;

        setState({ loading: false, notFound: false, product, similarProducts, alsoBoughtProducts });
      } catch {
        if (!cancelled) setState(NOT_FOUND);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [handle]);

  return state;
}
