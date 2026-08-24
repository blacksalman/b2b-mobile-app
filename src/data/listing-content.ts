import { products } from './products';
import { decorateProduct, discountBadgeOrEmpty, marginOf, reviewCountOf } from './decorateProduct';
import type { CartState } from './types';
import type { RailProduct } from './home-content';

// Ported verbatim from the new AyurvedaOne design system's `listingProducts`
// (Various Mobile App - Phone.dc.html line 2944-2947): `deco(x)` supplies margin/reviewCount as
// usual (marginOf/reviewCountOf by product id), but `rating` is overridden with a fixed 4-value
// array cycling by POSITION in the filtered result, not by product identity — same pattern as
// Home's curated rails. Only `rating`/`brandUpper`/`discount` are overridden; margin is NOT (unlike
// the old pre-redesign version of this file, which incorrectly overrode margin too).
const LISTING_RATING = ['4.5', '4.6', '4.7', '4.4'];

export function getListingProducts(ids: number[], cart: CartState, loggedIn: boolean, query: string): RailProduct[] {
  const q = query.trim().toLowerCase();
  // Matches the source's `P.filter(x=>s.listingIds.includes(x.id))` exactly: iterates the full
  // catalog in ascending-id order and tests membership, so the displayed order is always by id,
  // regardless of what order `ids` itself was built in.
  return products
    .filter((p) => ids.includes(p.id))
    .filter((p) => !q || (p.name + p.brand).toLowerCase().includes(q))
    .map((p, i) => ({
      ...decorateProduct(p, cart[p.id] || 0, loggedIn),
      rating: LISTING_RATING[i % 4],
      margin: marginOf(p.id),
      reviewCount: reviewCountOf(p.id),
      brandUpper: p.brand.toUpperCase(),
      discount: discountBadgeOrEmpty(p),
    }));
}
