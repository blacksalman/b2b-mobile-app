import { products } from './products';
import { decorateProduct, discountBadge } from './decorateProduct';
import type { CartState, DecoratedProduct } from './types';

// P[i] in the source script is 0-indexed into the same 10-product array; ids are 1-10 in that same
// order, so P[i] === products[i]. Kept as a helper to mirror the source's `P[n]` references exactly.
const P = products;

export interface RailProduct extends DecoratedProduct {
  rating: string;
  margin: string;
  brandUpper: string;
  discount: string;
}

function decorateWithContext(
  product: (typeof products)[number],
  cart: CartState,
  loggedIn: boolean,
  extra: { rating: string; margin: string },
): RailProduct {
  return {
    ...decorateProduct(product, cart[product.id] || 0, loggedIn),
    rating: extra.rating,
    margin: extra.margin,
    brandUpper: product.brand.toUpperCase(),
    discount: discountBadge(product),
  };
}

// --- Buy again (line 1449) ---
const BUY_AGAIN_SRC = [P[0], P[9], P[6], P[2], P[1]];
const BUY_AGAIN_TIMES = [7, 5, 4, 3, 3];
const BUY_AGAIN_RATING = ['4.5', '4.7', '4.6', '4.4', '4.8'];
const BUY_AGAIN_MARGIN = ['22%', '18%', '14%', '19%', '25%'];

export function getBuyAgain(cart: CartState, loggedIn: boolean): (RailProduct & { times: number })[] {
  return BUY_AGAIN_SRC.map((p, i) => ({
    ...decorateWithContext(p, cart, loggedIn, { rating: BUY_AGAIN_RATING[i], margin: BUY_AGAIN_MARGIN[i] }),
    times: BUY_AGAIN_TIMES[i],
  }));
}

// --- Featured (line 1458) ---
const FEATURED_SRC = [P[2], P[0], P[5], P[7]];
const FEATURED_RATING = ['4.7', '4.9', '4.4', '4.2'];
const FEATURED_MARGIN = ['19%', '22%', '21%', '16%'];

export function getFeatured(cart: CartState, loggedIn: boolean): (RailProduct & { hasOffer: boolean; noOffer: boolean })[] {
  return FEATURED_SRC.map((p, i) => ({
    ...decorateWithContext(p, cart, loggedIn, { rating: FEATURED_RATING[i], margin: FEATURED_MARGIN[i] }),
    hasOffer: i !== 1,
    noOffer: i === 1,
  }));
}

// Ported verbatim from `openFeatured` (line 1441): "View all" on this rail opens a Listing with the
// SAME id set shown here — the Listing screen just re-decorates them with its own generic
// rating/margin cycling instead of these fixed per-index arrays.
export const FEATURED_LISTING_IDS = FEATURED_SRC.map((p) => p.id);

// --- Best sellers (line 1486) ---
const BEST_SELLERS_SRC = [P[0], P[2], P[9], P[6], P[5]];
const BEST_SELLERS_RATING = ['4.9', '4.7', '4.6', '4.5', '4.4'];
const BEST_SELLERS_MARGIN = ['22%', '19%', '18%', '14%', '21%'];

export function getBestSellers(cart: CartState, loggedIn: boolean): (RailProduct & { rank: number })[] {
  return BEST_SELLERS_SRC.map((p, i) => ({
    ...decorateWithContext(p, cart, loggedIn, { rating: BEST_SELLERS_RATING[i], margin: BEST_SELLERS_MARGIN[i] }),
    rank: i + 1,
  }));
}

// Ported verbatim from `openBestSellers` (line 1472) — same id set as this rail.
export const BEST_SELLERS_LISTING_IDS = BEST_SELLERS_SRC.map((p) => p.id);

// --- New arrivals (line 1490) ---
const NEW_ARRIVALS_SRC = [P[5], P[7], P[1], P[6], P[9]];
const NEW_ARRIVALS_RATING = ['4.4', '4.2', '4.8', '4.3', '4.5'];
const NEW_ARRIVALS_MARGIN = ['21%', '16%', '25%', '12%', '17%'];

export function getNewArrivals(cart: CartState, loggedIn: boolean): RailProduct[] {
  return NEW_ARRIVALS_SRC.map((p, i) =>
    decorateWithContext(p, cart, loggedIn, { rating: NEW_ARRIVALS_RATING[i], margin: NEW_ARRIVALS_MARGIN[i] }),
  );
}

// Ported verbatim from `openNewArrivals` (line 1478) — same id set as this rail.
export const NEW_ARRIVALS_LISTING_IDS = NEW_ARRIVALS_SRC.map((p) => p.id);

// --- Concerns / shelves (line 1463) ---
interface ConcernSrc {
  title: string;
  tint: string;
  blurb: string;
  tags: string[];
  cat: string;
  idx: number[];
  ratings: string[];
  margins: string[];
}

const CONCERNS_SRC: ConcernSrc[] = [
  {
    title: 'Immunity & recovery shelf', tint: '#DCF5E9',
    blurb: 'Rasayana formulations built for daily repeat orders',
    tags: ['High repeat demand', 'Bulk friendly', 'Easy reorder'],
    cat: 'Rasayana & Immunity', idx: [1, 9, 0, 6], ratings: ['4.8', '4.6', '4.5', '4.7'], margins: ['25%', '14%', '22%', '18%'],
  },
  {
    title: 'Digestive & metabolic shelf', tint: '#FBEFD8',
    blurb: 'Classical churna and vati for common metabolic prescriptions',
    tags: ['High frequency', 'Long shelf life', 'Trade pricing'],
    cat: 'Diabetes Care', idx: [3, 4, 8, 2], ratings: ['4.6', '4.5', '4.7', '4.4'], margins: ['16%', '19%', '15%', '21%'],
  },
  {
    title: 'Skin & hair care shelf', tint: '#E4EEFB',
    blurb: 'Herbal tailas and oils for daily skin and scalp care',
    tags: ['Cold-pressed', 'Daily use', 'Dermat tested'],
    cat: 'Skin & Hair Care', idx: [0, 9, 5, 7], ratings: ['4.7', '4.5', '4.6', '4.3'], margins: ['18%', '22%', '14%', '20%'],
  },
  {
    title: 'Joint & muscle relief shelf', tint: '#F6E3E7',
    blurb: 'Taila and guggulu formulations for chronic joint care',
    tags: ['Bulk cartons', 'Long shelf life', 'Consistent quality'],
    cat: 'Joint & Muscle Care', idx: [6, 2, 1, 3], ratings: ['4.6', '4.8', '4.4', '4.5'], margins: ['17%', '20%', '23%', '15%'],
  },
];

export interface Concern {
  title: string;
  tint: string;
  blurb: string;
  tags: string[];
  cat: string;
  /** Ported verbatim from `view:()=>this.setState({listingIds:c.idx.map(i=>P[i].id),...})`
   *  (line 1466) — "Shop the shelf" opens a Listing scoped to exactly these ids. */
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
    products: c.idx.map((pi, i) =>
      decorateWithContext(P[pi], cart, loggedIn, { rating: c.ratings[i], margin: c.margins[i] }),
    ),
  }));
}

// --- Prescription groups (line 1505) — each group now maps to its own real category (source fixed
// a bug here: every group used to open the same generic 'Health supplement' category regardless of
// its actual subject; now each opens a Listing filtered to its correct `cat`). ---
export const prescriptionGroups = [
  { name: 'Grahani', count: 5, tint: '#DCF5E9', icon: '#25A567', glyph: '∿', cat: 'Diabetes Care' },
  { name: 'Yakrith Vikara', count: 2, tint: 'rgba(232,135,90,.14)', icon: '#E8875A', glyph: '❧', cat: 'Rasayana & Immunity' },
  { name: 'Prameha', count: 5, tint: 'rgba(74,143,199,.14)', icon: '#4A8FC7', glyph: '◍', cat: 'Diabetes Care' },
  { name: 'Tvak Roga', count: 7, tint: 'rgba(155,127,206,.16)', icon: '#9B7FCE', glyph: '⛨', cat: 'Skin & Hair Care' },
  { name: 'Pravahi Atisara', count: 2, tint: 'rgba(225,92,109,.14)', icon: '#E15C6D', glyph: '◐', cat: 'Classical Medicines' },
  { name: 'Ashmari', count: 2, tint: '#DCF5E9', icon: '#0F3D2E', glyph: '⚕', cat: 'Joint & Muscle Care' },
];

// --- Fast-moving offers (line 1507) — small mock rows, not full decorated products ---
export const fastMoving = [
  { name: 'Lomashatana Lepa', useCase: 'Lomashatanartha', pack: '60gms', price: '₹4.20', tint: 'rgba(217,169,78,.22)', pid: 1 },
  { name: 'Swarnmakshik Bhasma', useCase: 'Paandu', pack: '5gms', price: '₹0.90', tint: 'rgba(74,143,199,.18)', pid: 6 },
  { name: 'Kumkumadi Taila', useCase: 'Vyanga', pack: '10ml', price: '₹3.00', tint: 'rgba(155,127,206,.18)', pid: 7 },
];

// --- Promo banner carousel (line 1436) — the source fixed the first banner's nav target since our
// last sync: it used to point at a "Fruit & Vegetables" category left over from the "Various" grocery
// template this skin was derived from; it now correctly opens a Listing for 'Classical Medicines'
// (702 SKUs, matching CATS) instead.
export const promoBanners = [
  {
    eyebrow: 'BULK PRICING', title: 'Save more on 3+ cases', sub: 'Automatic tier discounts applied at checkout',
    tint: '#DCF5E9', accent: '#0F3D2E',
    targetListing: { cat: 'Classical Medicines', title: 'Classical Medicines', tagline: '702 SKUs · case pricing', tint: '#DCF5E9' },
  },
  { eyebrow: 'NEW STOCK', title: "This week's fresh arrivals", sub: 'Restocked daily from verified farms and mills', tint: '#FBEFD8', accent: '#7A5A1E', targetScreen: 'categories' as const },
  { eyebrow: 'FREE DELIVERY', title: 'Free delivery over ₹5,000', sub: 'On every order across all pickup zones', tint: '#E4EEFB', accent: '#1E4E7A', targetScreen: 'stores' as const },
];

// --- Brands to know (line 1484) --- Each card's bottom "Shop X · N SKUs" button is wired to
// `openBrand` in the source (brand-name filtered listing: title=short, tagline='Premium X products',
// tint=b.tint) — the sibling `shop` handler (category-filtered) exists in the source's JS but is
// never referenced by any onClick in the markup, confirmed by grep; it's dead code, same pattern as
// the earlier confirmed-dead voice-search trigger. Home wires the card's tap to `openBrand`'s logic.
export const brands = [
  {
    name: 'Himvin Ayurveda', short: 'Himvin', initials: 'HA', line: 'Classical medicines · Haridwar',
    rating: '4.6', skus: 128, margin: '19%', lead: 'Next-day', tint: 'rgba(217,169,78,.22)',
    blurb: 'GMP-certified manufacturer supplying 400+ pharmacies. Batch-tested churna and vati with full traceability on every carton.',
    cat: 'Classical Medicines',
    usps: ['AYUSH licensed', 'GMP certified', 'Batch traceability', 'Third-party lab tested'],
    reviews: '86',
  },
  {
    name: 'Sanjivani Ayurveda', short: 'Sanjivani', initials: 'SA', line: 'Tailas & skin care · Kerala',
    rating: '4.8', skus: 96, margin: '14%', lead: '48-hour', tint: 'rgba(217,169,78,.22)',
    blurb: 'Cold-pressed tailas and oils in trade cartons. Locked contract pricing for the full quarter once you place two orders.',
    cat: 'Skin & Hair Care',
    usps: ['Cold-pressed', 'Quarterly price lock', 'Trade cartons', 'Non-GMO verified'],
    reviews: '52',
  },
].map((b) => ({ ...b, metaLine: `${b.margin} avg margin · ${b.lead} delivery` }));

// --- Doctor's Talk (line 1530) ---
export const doctorTalks = [
  { quote: 'We recommend this platform to every clinic that needs verified supply chains and consistent batch quality.', name: 'Dr. Anita Rao', title: 'Clinical Nutritionist, 14 yrs practice', initials: 'AR' },
  { quote: 'Traceability on every carton means I can vouch for what my patients are buying, batch after batch.', name: 'Dr. Karan Mehta', title: 'Ayurvedic Physician', initials: 'KM' },
  { quote: 'Consistent supply and clear labeling — it is rare to find a wholesale partner this reliable.', name: 'Dr. Leela Nair', title: 'Dietitian & Wellness Consultant', initials: 'LN' },
];

// --- What buyers say (line 1524) ---
export const buyerReviews = [
  { quote: 'Ordering for our pharmacy used to take hours across three distributors. Now it is one app, one delivery slot, and prices that make sense for bulk.', name: 'Priya Sharma', tag: 'Pharmacy owner, Bengaluru', initials: 'PS' },
  { quote: 'Consistent stock, transparent pricing, and support that actually answers the phone during peak hours.', name: 'Farhan Sheikh', tag: 'Wellness store chain manager, Pune', initials: 'FS' },
  { quote: 'Switched our whole dispensary procurement here last quarter. Delivery slots keep our clinic running without gaps.', name: 'Meera Nambiar', tag: 'Ayurvedic clinic dispensary head, Kochi', initials: 'MN' },
  { quote: 'The trade pricing tiers made it easy to plan our budget months ahead. Reordering takes minutes now.', name: 'Rohit Verma', tag: 'Hospital pharmacy procurement lead, Jaipur', initials: 'RV' },
];
