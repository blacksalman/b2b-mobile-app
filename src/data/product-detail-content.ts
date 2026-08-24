import { products } from './products';
import { decorateProduct, discountBadge, marginOf, reviewCountOf } from './decorateProduct';
import { money } from '@/utils/money';
import type { CartState, Product } from './types';
import type { RailProduct } from './home-content';

// Ported verbatim from the new AyurvedaOne design system's `deco(p)` (Various Mobile App - Phone.dc.html
// line 2583) — `similarProducts`/`alsoBought` only override `rating` per-index (line 3030/3033); margin
// and reviewCount are left as `deco()`'s own real formulas, unlike the old design which hardcoded a
// static margin array here. `discount` still uses the shared `discountBadge` helper (identical math).
function decorate(p: Product, cart: CartState, loggedIn: boolean, rating: string): RailProduct {
  return {
    ...decorateProduct(p, cart[p.id] || 0, loggedIn),
    rating,
    margin: marginOf(p.id) + '%',
    reviewCount: reviewCountOf(p.id),
    brandUpper: p.brand.toUpperCase(),
    discount: discountBadge(p),
  };
}

const SIMILAR_RATINGS = ['4.6', '4.7', '4.5', '4.8'];

// Ported verbatim from the source's `similarProducts` (line 3029):
// `P.filter(x=>x.cat===p.cat&&x.id!==p.id).concat(P.filter(x=>x.id!==p.id)).slice(0,4)`. The second
// filter is NOT deduped against the first, so when a product's category has fewer than 3 other
// members, the same-category product(s) can appear a second time within the first 4 results (e.g.
// product id 10's shelf repeats product id 2). This is a genuine source quirk, not a bug — replicate
// the exact concat-then-slice, and key the rendered list by index (not id) since ids can repeat.
export function getSimilarProducts(product: Product, cart: CartState, loggedIn: boolean): RailProduct[] {
  const sameCat = products.filter((x) => x.cat === product.cat && x.id !== product.id);
  const allExceptSelf = products.filter((x) => x.id !== product.id);
  const combined = sameCat.concat(allExceptSelf).slice(0, 4);
  return combined.map((p, i) => decorate(p, cart, loggedIn, SIMILAR_RATINGS[i]));
}

const ALSO_BOUGHT_RATINGS = ['4.4', '4.6', '4.9', '4.5'];

// Ported verbatim from the source's `alsoBought` (line 3032): last 4 products (excluding this one),
// reversed — no dedupe issue here since there's only ever one instance of each id in `products`.
export function getAlsoBought(product: Product, cart: CartState, loggedIn: boolean): RailProduct[] {
  const reversed = products
    .filter((x) => x.id !== product.id)
    .slice()
    .reverse()
    .slice(0, 4);
  return reversed.map((p, i) => decorate(p, cart, loggedIn, ALSO_BOUGHT_RATINGS[i]));
}

// Ported verbatim from the new design's `bulkTiers` (line 3045) — 3-tier pricing using the shared
// `BULK` multiplier (0.94), the first row highlighted in `primarySoft`/`primaryInk`, the rest plain.
// Distinct from the old design's 2-tier "5% off" table this replaces.
const BULK = 0.94;
export function bulkTiersFor(product: Product): { label: string; price: string; rowBg: string; labelColor: string }[] {
  const base = product.price || 12;
  return [
    { label: '1 - 9 units', price: money(base) + '/unit', rowBg: '#DCF5E9', labelColor: '#0C4733' },
    { label: '10 - 24 units', price: money(base * BULK) + '/unit', rowBg: '#FFFFFF', labelColor: '#586360' },
    { label: '25+ units', price: money(base * BULK * 0.945) + '/unit', rowBg: '#FFFFFF', labelColor: '#586360' },
  ];
}

// Ported verbatim from `productSpecs` (line 3044) — same fixed Form/Shelf life/Licence for every
// product, only Brand/Pack size come from the real product record.
export function productSpecsFor(product: Product): { k: string; v: string }[] {
  return [
    { k: 'Brand', v: product.brand },
    { k: 'Pack size', v: product.cs },
    { k: 'Form', v: 'Churna' },
    { k: 'Shelf life', v: '24 months' },
    { k: 'Licence', v: 'AYUSH licensed' },
  ];
}

// Ported verbatim (line 2205) — templated with the product's own name, otherwise identical copy for
// every product.
export function productDescriptionFor(product: Product): string {
  return (
    product.name +
    ' is a potent Ayurvedic formulation crafted under GMP-certified conditions, blending time-tested herbal ingredients for consistent, batch-tested quality. It is designed for retailers and clinics seeking a reliable, classically-formulated product with full traceability, third-party lab verification, and steady wholesale supply for repeat orders.'
  );
}

// Ported verbatim (lines 1969-1972) — same "About brand" content on every product page, not
// per-product/per-brand despite the product having its own real `brand` field.
export const brandLegalName = 'AyurvedaOne Private Limited';
export const brandShort = 'AyurvedaOne';
export const brandStats = [
  { value: '2016', label: 'Since' },
  { value: '3+', label: 'Facilities' },
  { value: 'R&D', label: 'Focused' },
];
export const brandUsps = ['Purity First', 'Physician-led', 'Quality Made'];
export const brandAbout =
  'Ancient wisdom meets modern science at AyurvedaOne. Since 2016, we have focused on quality Ayurvedic wellness through physician-led formulations, modern R&D, and manufacturing that emphasizes purity, safety, and consistency for today’s lifestyles.';

// Ported verbatim (lines 2191-2198) — same fixed rating summary and review list on every product's
// Reviews screen, not per-product.
export const reviewsSummary = {
  avg: '4.6',
  count: 128,
  breakdown: [
    { star: 5, pct: 68 },
    { star: 4, pct: 19 },
    { star: 3, pct: 8 },
    { star: 2, pct: 3 },
    { star: 1, pct: 2 },
  ],
};

export const reviewList = [
  { initials: 'AR', name: 'Anita R.', stars: 5, date: '2 weeks ago', text: 'Consistent batch quality every order. Our clinic has switched fully to this supplier.' },
  { initials: 'KM', name: 'Karan M.', stars: 5, date: '1 month ago', text: 'Fast dispatch and the packaging is always tamper-proof. Very reliable for repeat orders.' },
  { initials: 'LN', name: 'Leela N.', stars: 4, date: '1 month ago', text: 'Good product, pricing tiers are fair for bulk. Delivery took a day longer than expected once.' },
  { initials: 'PS', name: 'Priya S.', stars: 5, date: '2 months ago', text: 'Great margin for retailers and the trade pricing makes planning easy each quarter.' },
];
