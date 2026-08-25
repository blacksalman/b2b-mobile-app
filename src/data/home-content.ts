import { products, productById } from './products';
import { decorateProduct, discountBadge, marginOf, reviewCountOf } from './decorateProduct';
import { money } from '@/utils/money';
import type { CartState, DecoratedProduct } from './types';

// Rebuilt against the new AyurvedaOne design system (Various Mobile App - Phone.dc.html, DCLogic
// `renderVals()` section, line 2611+) — a full content pull for the redesigned Home screen, not a
// restyle of the old data. Only Home/Search import the VALUE exports below (verified via grep), but
// the RailProduct/Concern TYPES are also imported by categories-content.ts, listing-content.ts,
// product-detail-content.ts and ProductCard.tsx/ConcernShelf.tsx (screens not yet migrated) — so
// `brandUpper`/`discount`/`tags` stay on these types even though the new Home/Search cards don't
// render them, and the new `reviewCount` field is optional rather than required so those untouched
// files don't need changes.
const P = products;

export interface RailProduct extends DecoratedProduct {
  rating: string;
  margin: string;
  brandUpper: string;
  discount: string;
  reviewCount?: number;
}

function decorateWithContext(
  product: (typeof products)[number],
  cart: CartState,
  loggedIn: boolean,
  rating: string,
): RailProduct {
  return {
    ...decorateProduct(product, cart[product.id] || 0, loggedIn),
    rating,
    margin: marginOf(product.id),
    brandUpper: product.brand.toUpperCase(),
    discount: discountBadge(product),
    reviewCount: reviewCountOf(product.id),
  };
}

// --- Featured (line 2760) — the only rail where the compare-at price is conditional (`hasOffer`) ---
const FEATURED_SRC = [P[2], P[0], P[5], P[7]];
const FEATURED_RATING = ['4.7', '4.9', '4.4', '4.2'];

export function getFeatured(cart: CartState, loggedIn: boolean): (RailProduct & { hasOffer: boolean; noOffer: boolean })[] {
  return FEATURED_SRC.map((p, i) => ({
    ...decorateWithContext(p, cart, loggedIn, FEATURED_RATING[i]),
    hasOffer: i !== 1,
    noOffer: i === 1,
  }));
}

// Ported verbatim from `openFeatured` (line 2758): "View all" opens a Listing with this same id set.
export const FEATURED_LISTING_IDS = FEATURED_SRC.map((p) => p.id);

// --- Best sellers (line 2791) ---
const BEST_SELLERS_SRC = [P[0], P[2], P[9], P[6], P[5]];
const BEST_SELLERS_RATING = ['4.9', '4.7', '4.6', '4.5', '4.4'];

export function getBestSellers(cart: CartState, loggedIn: boolean): (RailProduct & { rank: number })[] {
  return BEST_SELLERS_SRC.map((p, i) => ({
    ...decorateWithContext(p, cart, loggedIn, BEST_SELLERS_RATING[i]),
    rank: i + 1,
  }));
}

// Ported verbatim from `openBestSellers` (line 2789) — same id set as this rail.
export const BEST_SELLERS_LISTING_IDS = BEST_SELLERS_SRC.map((p) => p.id);

// --- New arrivals (line 2797) ---
const NEW_ARRIVALS_SRC = [P[5], P[7], P[1], P[6], P[9]];
const NEW_ARRIVALS_RATING = ['4.4', '4.2', '4.8', '4.3', '4.5'];

export function getNewArrivals(cart: CartState, loggedIn: boolean): RailProduct[] {
  return NEW_ARRIVALS_SRC.map((p, i) => decorateWithContext(p, cart, loggedIn, NEW_ARRIVALS_RATING[i]));
}

// Ported verbatim from `openNewArrivals` (line 2795) — same id set as this rail.
export const NEW_ARRIVALS_LISTING_IDS = NEW_ARRIVALS_SRC.map((p) => p.id);

// --- Concerns / shelves (line 2765) — the new card markup never renders `tags`, but the type keeps
// it (see the file-level note above: ConcernShelf.tsx, not migrated yet, still reads it) using the
// same tag copy as the previous pull. `margin` is no longer a per-index array — deco() never
// overrides it, so every concern-shelf card uses the same `marginOf()` formula as everywhere else. ---
interface ConcernSrc {
  title: string;
  tint: string;
  blurb: string;
  tags: string[];
  cat: string;
  idx: number[];
  ratings: string[];
}

const CONCERNS_SRC: ConcernSrc[] = [
  { title: 'Immunity & recovery shelf', tint: '#DCF5E9', blurb: 'Rasayana formulations built for daily repeat orders', tags: ['High repeat demand', 'Bulk friendly', 'Easy reorder'], cat: 'Rasayana & Immunity', idx: [1, 9, 0, 6], ratings: ['4.8', '4.6', '4.5', '4.7'] },
  { title: 'Digestive & metabolic shelf', tint: '#FCF1E0', blurb: 'Classical churna and vati for common metabolic prescriptions', tags: ['High frequency', 'Long shelf life', 'Trade pricing'], cat: 'Diabetes Care', idx: [3, 4, 8, 2], ratings: ['4.6', '4.5', '4.7', '4.4'] },
  { title: 'Skin & hair care shelf', tint: '#EAEFF7', blurb: 'Herbal tailas and oils for daily skin and scalp care', tags: ['Cold-pressed', 'Daily use', 'Dermat tested'], cat: 'Skin & Hair Care', idx: [0, 9, 5, 7], ratings: ['4.7', '4.5', '4.6', '4.3'] },
  { title: 'Joint & muscle relief shelf', tint: '#F7EBED', blurb: 'Taila and guggulu formulations for chronic joint care', tags: ['Bulk cartons', 'Long shelf life', 'Consistent quality'], cat: 'Joint & Muscle Care', idx: [6, 2, 1, 3], ratings: ['4.6', '4.8', '4.4', '4.5'] },
];

export interface Concern {
  title: string;
  tint: string;
  blurb: string;
  tags: string[];
  cat: string;
  /** Ported verbatim from `view:()=>this.setState({listingIds:c.idx.map(i=>P[i].id),...})`
   *  (line 2783) — "view" opens a Listing scoped to exactly these ids. */
  ids: number[];
  products: RailProduct[];
}

export function getConcerns(cart: CartState, loggedIn: boolean): Concern[] {
  return CONCERNS_SRC.map((c) => ({
    title: c.title,
    tint: c.tint,
    blurb: c.blurb,
    tags: c.tags,
    cat: c.cat,
    ids: c.idx.map((pi) => P[pi].id),
    products: c.idx.map((pi, i) => decorateWithContext(P[pi], cart, loggedIn, c.ratings[i])),
  }));
}

// --- Prescription groups (line 2827) — `icon` is unused in the new card markup (the glyph's text
// color is fixed `#0C4733`, not per-group), so it's dropped here. ---
export const prescriptionGroups = [
  { name: 'Grahani', count: 5, tint: '#DCF5E9', glyph: '∿', cat: 'Diabetes Care' },
  { name: 'Yakrith Vikara', count: 2, tint: '#FCF1E0', glyph: '❧', cat: 'Rasayana & Immunity' },
  { name: 'Prameha', count: 5, tint: '#EAEFF7', glyph: '◍', cat: 'Diabetes Care' },
  { name: 'Tvak Roga', count: 7, tint: '#EAEFF7', glyph: '⛨', cat: 'Skin & Hair Care' },
  { name: 'Pravahi Atisara', count: 2, tint: '#F7EBED', glyph: '◐', cat: 'Classical Medicines' },
  { name: 'Ashmari', count: 2, tint: '#DCF5E9', glyph: '⚕', cat: 'Joint & Muscle Care' },
];

// --- Fast-moving offers (line 2815) — the new source now shows the REAL product's own name/pack/
// price (`m.name = x.name`, `m.pack = x.cs`, `m.price = money(x.price)`) instead of the old design's
// fictional standalone names ("Lomashatana Lepa" etc.) that didn't match the linked product. ---
const FAST_MOVING_SRC = [
  { useCase: 'Grahani', pid: 1 },
  { useCase: 'Vyanga', pid: 6 },
  { useCase: 'Khalitya', pid: 8 },
];

export interface FastMovingItem {
  pid: number;
  useCase: string;
  name: string;
  pack: string;
  price: string;
}

export const fastMoving: FastMovingItem[] = FAST_MOVING_SRC.map((m) => {
  const p = productById(m.pid)!;
  return { pid: m.pid, useCase: m.useCase, name: p.name, pack: p.cs, price: money(p.price || 0) };
});

// --- Hero carousel (line 2742) — new: 3 swipeable tinted slides, replacing the old design's single
// static hero block. ---
export interface HeroSlide {
  eyebrow: string;
  title: string;
  tint: string;
  blurb: string;
  cta: string;
  cat: string;
}

export const heroSlides: HeroSlide[] = [
  { eyebrow: 'TRADE PRICE · CASE ORDERS', title: 'Immunity & Wellness', tint: '#DCF5E9', blurb: 'Up to 50% off your first carton order. Next-day dispatch before 9am.', cta: 'Discover now', cat: 'Rasayana & Immunity' },
  { eyebrow: 'GMP CERTIFIED · BULK', title: 'Classical Medicines', tint: '#EDF1EA', blurb: 'Churna, vati and bhasma in trade cartons. Batch-tested, fully traceable.', cta: 'Shop classical', cat: 'Classical Medicines' },
  { eyebrow: 'NET 30 TERMS', title: 'Skin & Hair Care', tint: '#EAEFF7', blurb: 'Cold-pressed tailas and oils. Order now, pay in 30 days on approved accounts.', cta: 'Browse tailas', cat: 'Skin & Hair Care' },
];

// --- Promo banner carousel (line 2753) — `eyebrow`/`title`/`sub` all render in fixed colors in the
// new markup (no per-banner accent), so the old design's `accent` field is dropped. Read-only
// display cards, not links to anything - the old targetListing/targetScreen navigation fields
// were dropped once tapping these was removed. ---
export const promoBanners = [
  { eyebrow: 'BULK PRICING', title: 'Save more on 3+ cases', sub: 'Automatic tier discounts applied at checkout', tint: '#DCF5E9' },
  { eyebrow: 'NEW STOCK', title: "This week's fresh arrivals", sub: 'Restocked daily from verified farms and mills', tint: '#FCF1E0' },
  { eyebrow: 'FREE DELIVERY', title: 'Free delivery over ₹5,000', sub: 'On every order across all pickup zones', tint: '#EAEFF7' },
];

// --- Brands to know (line 2801) — card image placeholder is fixed `#DCF5E9` in the new markup, not
// `b.tint`, so tint is kept only as data (still used by `openBrand`'s listing tint) but no longer
// drives the card's own visual. ---
export const brands = [
  {
    name: 'Himvin Ayurveda', short: 'Himvin', initials: 'HA', line: 'Classical medicines · Haridwar',
    rating: '4.6', skus: 128, margin: '19%', lead: 'Next-day', tint: '#FCF1E0',
    blurb: 'GMP-certified manufacturer supplying 400+ pharmacies. Batch-tested churna and vati with full traceability on every carton.',
    cat: 'Classical Medicines',
    usps: ['AYUSH licensed', 'GMP certified', 'Batch traceability', 'Third-party lab tested'],
    reviews: '86',
  },
  {
    name: 'Sanjivani Ayurveda', short: 'Sanjivani', initials: 'SA', line: 'Tailas & skin care · Kerala',
    rating: '4.8', skus: 96, margin: '14%', lead: '48-hour', tint: '#FCF1E0',
    blurb: 'Cold-pressed tailas and oils in trade cartons. Locked contract pricing for the full quarter once you place two orders.',
    cat: 'Skin & Hair Care',
    usps: ['Cold-pressed', 'Quarterly price lock', 'Trade cartons', 'Non-GMO verified'],
    reviews: '52',
  },
].map((b) => ({ ...b, metaLine: `${b.margin} avg margin · ${b.lead} delivery` }));

// --- Doctor's Talk (line 2844) — unchanged content from the previous pull. ---
export const doctorTalks = [
  { quote: 'We recommend this platform to every clinic that needs verified supply chains and consistent batch quality.', name: 'Dr. Anita Rao', title: 'Clinical Nutritionist, 14 yrs practice', initials: 'AR' },
  { quote: 'Traceability on every carton means I can vouch for what my patients are buying, batch after batch.', name: 'Dr. Karan Mehta', title: 'Ayurvedic Physician', initials: 'KM' },
  { quote: 'Consistent supply and clear labeling — it is rare to find a wholesale partner this reliable.', name: 'Dr. Leela Nair', title: 'Dietitian & Wellness Consultant', initials: 'LN' },
];

// --- What buyers say (line 2838) — unchanged content from the previous pull. ---
export const buyerReviews = [
  { quote: 'Ordering for our pharmacy used to take hours across three distributors. Now it is one app, one delivery slot, and prices that make sense for bulk.', name: 'Priya Sharma', tag: 'Pharmacy owner, Bengaluru', initials: 'PS' },
  { quote: 'Consistent stock, transparent pricing, and support that actually answers the phone during peak hours.', name: 'Farhan Sheikh', tag: 'Wellness store chain manager, Pune', initials: 'FS' },
  { quote: 'Switched our whole dispensary procurement here last quarter. Delivery slots keep our clinic running without gaps.', name: 'Meera Nambiar', tag: 'Ayurvedic clinic dispensary head, Kochi', initials: 'MN' },
  { quote: 'The trade pricing tiers made it easy to plan our budget months ahead. Reordering takes minutes now.', name: 'Rohit Verma', tag: 'Hospital pharmacy procurement lead, Jaipur', initials: 'RV' },
];
