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
  const disc = loggedIn ? 0.9 : 1;
  const price = product.price || 0;

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

  const compareEachBase = product.cmp || price * 1.18;
  const compareEach = money(compareEachBase / (n < 2 ? 1 : n));

  return {
    ...product,
    caseLabel: product.cs,
    gated,
    showPrice: !gated,
    priceLabel: gated ? '' : money(price * disc),
    compareLabel: product.cmp ? money(product.cmp) : money(price * 1.18),
    unitPriceLabel: gated ? '' : money(price / 6) + ' / unit',
    priceOrGate: gated ? 'log in for price' : money(price * disc),
    packLine: (product.cmp ? 'MRP ' + money(product.cmp) + ' · ' : '') + product.cs,
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
