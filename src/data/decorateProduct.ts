import { money } from '@/utils/money';
import type { DecoratedProduct, Product } from './types';

// Ported verbatim from the source prototype's `gated(p)` (line 1391).
export function isGated(product: Product, gatePricingEnabled: boolean, loggedIn: boolean): boolean {
  return gatePricingEnabled && !!product.gated && !loggedIn;
}

const PACK_COUNT_RE = /(?:of|x|×)\s*(\d+)/i;
const PACK_NOUNS = ['case', 'crate', 'sack', 'bundle', 'pack', 'box', 'tray'];

// Ported verbatim from the source prototype's `deco(p)` (line 1392). The prototype attaches bound
// methods (open/add/inc/dec) onto the decorated object; here those become AppStateContext actions
// supplied by the caller instead — every computed value/label below matches 1:1.
export function decorateProduct(
  product: Product,
  cartQty: number,
  loggedIn: boolean,
  gatePricingEnabled = true,
): DecoratedProduct {
  const gated = isGated(product, gatePricingEnabled, loggedIn);
  // Blanket "logged-in trade discount" from the original mock-catalog prototype - no backend
  // counterpart at all (confirmed live: the real Medusa cart charges the full real price with no
  // such discount), so it must only ever apply to the mock catalog, never a real API-backed
  // product (product.medusaId only ever set for those) - otherwise every real price label here
  // silently undercuts the real price by 10% for a logged-in shopper while Cart/Checkout (reading
  // the real cart directly) show the true, higher number.
  const isRealProduct = !!product.medusaId;
  const disc = loggedIn && !isRealProduct ? 0.9 : 1;
  // Real GST rate (product.taxRate, taxRates.ts) folded into every customer-facing price label
  // below - product.price/product.cmp themselves stay the raw pre-tax base (still used
  // correctly by quantity-tier math, cart sync, and the real Medusa cart's own tax calculation,
  // none of which read these formatted label strings). undefined taxRate (mock catalog) means
  // taxMult is exactly 1, i.e. no change to existing mock-catalog price displays.
  const taxMult = 1 + (product.taxRate ?? 0) / 100;
  const price = (product.price || 0) * taxMult;
  const cmp = product.cmp ? product.cmp * taxMult : undefined;

  const countMatch = PACK_COUNT_RE.exec(product.cs || '');
  const n = countMatch ? Number(countMatch[1]) : 1;

  const eachLabel = gated
    ? ''
    : n < 2
      ? money(price * disc) + ' for each'
      : money((price * disc) / n) + ' for each';

  const packNoun = (() => {
    const w = (product.cs || 'pack').split(' ')[0].toLowerCase();
    return PACK_NOUNS.includes(w) ? w : 'pack';
  })();

  const compareEachBase = cmp || price * 1.18;
  const compareEach = money(compareEachBase / (n < 2 ? 1 : n));

  return {
    ...product,
    caseLabel: product.cs,
    gated,
    showPrice: !gated,
    priceLabel: gated ? '' : money(price * disc),
    compareLabel: cmp ? money(cmp) : money(price * 1.18),
    unitPriceLabel: gated ? '' : money(price / 6) + ' / unit',
    priceOrGate: gated ? 'log in for price' : money(price * disc),
    packLine: (cmp ? 'MRP ' + money(cmp) + ' · ' : '') + product.cs,
    eachLabel,
    packNoun,
    compareEach,
    cartQty,
    inCart: cartQty > 0,
    notInCart: !(cartQty > 0),
  };
}

// Ported verbatim from the source prototype's discount-badge expression used everywhere a product
// card shows a "-25%" style chip, e.g. line 1452: `x.cmp?('-'+Math.round((1-x.price/x.cmp)*100)+'%'):'trade rate'`
export function discountBadge(product: Product): string {
  return product.cmp ? '-' + Math.round((1 - product.price / product.cmp) * 100) + '%' : 'trade rate';
}

// Ported verbatim from catProducts/listingProducts' own discount expression (source line 1596/1603):
// `x.cmp?('-'+Math.round((1-x.price/x.cmp)*100)+'%'):''` — same math as discountBadge, but the
// Categories and Listing screens use an EMPTY-STRING fallback instead of 'trade rate'. Two separate
// helpers because the source itself uses two different fallback literals depending on screen.
export function discountBadgeOrEmpty(product: Product): string {
  return product.cmp ? '-' + Math.round((1 - product.price / product.cmp) * 100) + '%' : '';
}

// Ported verbatim from the new AyurvedaOne design system source's `marginOf(p)`/`deco(p)`
// (Various Mobile App - Phone.dc.html line 2557/2588 & 2836). `deco()` attaches these to every
// product card; Home's curated rails override `rating` with fixed per-index arrays afterward, but
// never override `margin` or `reviewCount` — so these three formulas are the actual value shown
// everywhere in the new design (Home rails' margin/reviewCount, and Search results' rating too,
// since Search never overrides deco()'s output). Additive here since `decorateProduct` above is
// shared with screens not yet migrated — these are new exports, not changes to existing ones.
export function marginOf(id: number): string {
  return 14 + ((id * 5) % 12) + '%';
}

export function ratingOf(id: number): string {
  return (4.1 + ((id * 7) % 9) / 10).toFixed(1);
}

export function reviewCountOf(id: number): number {
  return 12 + ((id * 17) % 88);
}
