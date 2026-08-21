import { products } from './products';
import { decorateProduct, discountBadgeOrEmpty } from './decorateProduct';
import type { CartState } from './types';
import type { RailProduct } from './home-content';

// Ported verbatim from the source's `listingProducts` (line 1594): the same product decoration is
// used regardless of how you arrived at the Listing screen (prescription group, brand card, concern
// shelf, promo banner, or a Home "View all" link) — rating/margin just cycle through a fixed 4-value
// array by POSITION in the filtered result, not by product identity.
const LISTING_RATING = ['4.5', '4.6', '4.7', '4.4'];
const LISTING_MARGIN = ['19%', '16%', '22%', '14%'];

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
      margin: LISTING_MARGIN[i % 4],
      brandUpper: p.brand.toUpperCase(),
      discount: discountBadgeOrEmpty(p),
    }));
}
