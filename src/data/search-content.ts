import { products } from './products';
import { decorateProduct, discountBadge } from './decorateProduct';
import type { CartState } from './types';
import type { RailProduct } from './home-content';

// Ported verbatim from the source's `recent` array (line 1614). These are leftover grocery-themed
// strings from the "Various" template this AyurvedaOne skin was derived from ("lamb chops" etc.) —
// they read as thematically inconsistent with an Ayurvedic-products app, but the source markup
// itself (not just the mock data) hard-codes the same "lamb" copy in the voice-search panel
// (lines 859-860: 'Try "two cases of lamb chops"' / 'Use "lamb"'), so this is the design as shipped,
// not a data-only artifact — replicated verbatim per the fidelity rule, not fixed.
export const recentSearches = ['carrots case', 'lamb chops', 'net 30 dairy', 'basmati 20kg'];

// Ported verbatim from the source's voice-search result (line 1613): `voiceResult` always sets the
// query to the literal string 'lamb', regardless of what was "said".
export const VOICE_SEARCH_RESULT = 'lamb';

const RESULT_RATING = ['4.7', '4.6', '4.8', '4.5', '4.4'];

// Ported verbatim from the source's `results` (line 1431): substring match on name+brand+cat, or the
// first 5 products when the query is empty.
export function getSearchResults(cart: CartState, loggedIn: boolean, query: string): RailProduct[] {
  const q = query.trim().toLowerCase();
  const base = q
    ? products.filter((p) => (p.name + p.brand + p.cat).toLowerCase().includes(q))
    : products.slice(0, 5);
  return base.map((p, i) => ({
    ...decorateProduct(p, cart[p.id] || 0, loggedIn),
    rating: RESULT_RATING[i % RESULT_RATING.length],
    margin: '',
    brandUpper: p.brand.toUpperCase(),
    discount: discountBadge(p),
  }));
}
