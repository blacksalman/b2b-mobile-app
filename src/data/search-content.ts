import { products } from './products';
import { decorateProduct, discountBadge, marginOf, ratingOf, reviewCountOf } from './decorateProduct';
import type { CartState } from './types';
import type { RailProduct } from './home-content';

// Ported verbatim from the source's `recent` array (line 3004). These are leftover grocery-themed
// strings from the "Various" template this AyurvedaOne skin was derived from ("lamb chops" etc.) —
// unchanged from the previous pull, still present verbatim in the new source too.
export const recentSearches = ['carrots case', 'lamb chops', 'net 30 dairy', 'basmati 20kg'];

// Ported verbatim from the source's voice-search result (line 3003): `voiceResult` always sets the
// query to the literal string 'lamb'. Still dead code in the new markup — nothing calls `toggleVoice`
// anywhere (confirmed by re-checking the new source), so `listening` stays unreachable in practice,
// same as the previous build.
export const VOICE_SEARCH_RESULT = 'lamb';

// Ported verbatim from the source's `results` (line 2633): `P.filter(...).map(x=>this.deco(x))` with
// NO per-index override afterward (unlike Home's curated rails) — so rating/margin/reviewCount here
// are the raw `marginOf`/`ratingOf`/`reviewCountOf` formulas, not a fixed array.
export function getSearchResults(cart: CartState, loggedIn: boolean, query: string): RailProduct[] {
  const q = query.trim().toLowerCase();
  const base = q
    ? products.filter((p) => (p.name + p.brand + p.cat).toLowerCase().includes(q))
    : products.slice(0, 5);
  return base.map((p) => ({
    ...decorateProduct(p, cart[p.id] || 0, loggedIn),
    rating: ratingOf(p.id),
    margin: marginOf(p.id),
    brandUpper: p.brand.toUpperCase(),
    discount: discountBadge(p),
    reviewCount: reviewCountOf(p.id),
  }));
}
