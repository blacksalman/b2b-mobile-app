import { products } from './products';
import { decorateProduct, discountBadge } from './decorateProduct';
import type { CartState } from './types';
import type { RailProduct } from './home-content';

// Ported verbatim from the source's catBanner (line 1542).
export const catBanner = {
  title: 'Pure tailas, medicated the traditional way',
  sub: 'Explore the cold-pressed oil range',
  tint: '#FBEFD8',
};

// Ported verbatim from the source's filterTabs names (line 1547) and each option list (lines 1552-1572).
export const filterTabNames = ['Brand', 'Sort By', 'Price', 'Availability', 'Ingredients', 'Concern', 'Product form'] as const;
export type FilterTabName = (typeof filterTabNames)[number];

export const brandOptions = ['AYUR VIBES', 'AYURVEDA ONE PVT LTD.'];
export const sortOptions = ['Popular', 'Price: Low to High', 'Price: High to Low', 'Newest'];
export const priceOptions = ['Under ₹200', '₹200–₹500', '₹500–₹1000', 'Above ₹1000'];
export const availOptions = ['In stock only', 'Include out of stock'];
export const ingredientOptions = ['Ashwagandha', 'Triphala', 'Guggulu', 'Amla', 'Neem', 'Bhringraj'];
export const concernOptions = ['Immunity', 'Digestion', 'Joint & muscle', 'Skin & hair', "Women's health", 'Diabetes care'];
export const formOptions = ['Churna', 'Tablet', 'Capsule', 'Taila / Oil', 'Syrup / Asava', 'Bhasma'];

// The filter sheet's checkbox/radio selections are inert by design in the source prototype — the
// grid below is filtered ONLY by the live search text (catQuery), never by these picks. Replicated
// as-is per the fidelity rule; do not wire these into catProducts filtering.

// Ported verbatim from catProducts (line 1589): per-index rating/margin overlay on every product.
const CAT_RATING = ['4.5', '4.7', '4.4', '4.6', '4.3', '4.8', '4.5', '4.6', '4.4', '4.7'];
const CAT_MARGIN = ['19%', '25%', '18%', '16%', '21%', '14%', '19%', '23%', '17%', '15%'];

export interface CatProduct extends RailProduct {
  hasOffer: boolean;
  noOffer: boolean;
}

export function getCatProducts(cart: CartState, loggedIn: boolean, query: string): CatProduct[] {
  const q = query.trim().toLowerCase();
  return products
    .map((p, i) => {
      const deco = decorateProduct(p, cart[p.id] || 0, loggedIn);
      return {
        ...deco,
        rating: CAT_RATING[i],
        margin: CAT_MARGIN[i],
        brandUpper: p.brand.toUpperCase(),
        hasOffer: !!p.cmp && !p.gated,
        noOffer: !p.cmp && !p.gated,
        discount: discountBadge(p),
      };
    })
    .filter((p) => !q || (p.name + p.brand).toLowerCase().includes(q));
}
