import { products } from './products';
import { money } from '@/utils/money';
import type { CartState } from './types';

export interface CartLine {
  id: number;
  tint: string;
  name: string;
  brandUpper: string;
  caseLabel: string;
  qty: number;
  total: string;
  mrpTotal: string;
  priceEach: string;
  mrpEach: string;
  hasOffer: boolean;
  noOffer: boolean;
  discount: string;
}

export interface CartTotals {
  cartLines: CartLine[];
  cartEmpty: boolean;
  cartHasItems: boolean;
  cartCount: number;
  subtotal: string;
  taxAmount: string;
  total: string;
  mrpTotal: string;
  cartHasDiscount: boolean;
  savePercent: string;
  shippingFee: string;
  payTotal: string;
  volumeDiscount: string;
  hasVolumeDiscount: boolean;
}

// Ported verbatim from renderVals() (source lines 1933-1948, 2260-2272). The tiered volume discount
// (10% over ₹100 subtotal, 20% over ₹200 — same tiers the old `tierNudge` banner used to surface) is
// still applied when computing the grand total even though the Cart/Checkout UI no longer shows a
// separate "Volume discount" line — it's folded silently into `total` vs `mrpTotal`/`savePercent`.
// Shared by the Cart page, Checkout page, and the mini-cart FAB/sheet so all four surfaces agree.
export function computeCartTotals(cart: CartState): CartTotals {
  const ids = Object.keys(cart)
    .map(Number)
    .filter((id) => cart[id] > 0);

  const cartLines: CartLine[] = ids.map((id) => {
    const product = products.find((x) => x.id === id)!;
    const qty = cart[id];
    const unit = product.price || 12;
    const mrp = product.cmp || unit;
    return {
      id,
      tint: product.tint,
      name: product.name,
      brandUpper: product.brand.toUpperCase(),
      caseLabel: product.cs,
      qty,
      total: money(unit * qty),
      mrpTotal: money(mrp * qty),
      priceEach: money(unit),
      mrpEach: money(mrp),
      hasOffer: !!product.cmp,
      noOffer: !product.cmp,
      discount: product.cmp ? '-' + Math.round((1 - unit / mrp) * 100) + '%' : '',
    };
  });

  const sub = ids.reduce((a, id) => {
    const product = products.find((x) => x.id === id)!;
    return a + (product.price || 12) * cart[id];
  }, 0);
  const mrpSub = ids.reduce((a, id) => {
    const product = products.find((x) => x.id === id)!;
    return a + (product.cmp || product.price || 12) * cart[id];
  }, 0);
  const disc = sub > 200 ? sub * 0.2 : sub > 100 ? sub * 0.1 : 0;
  const taxAmt = Math.round(sub * 0.05 * 100) / 100;
  const grandTotal = Math.round((Math.max(0, sub - disc) + taxAmt) * 100) / 100;
  const mrpGrandTotal = Math.round((mrpSub + taxAmt) * 100) / 100;
  const cartHasDiscount = mrpGrandTotal > grandTotal + 0.01;

  return {
    cartLines,
    cartEmpty: cartLines.length === 0,
    cartHasItems: cartLines.length > 0,
    cartCount: cartLines.reduce((n, l) => n + l.qty, 0),
    subtotal: money(sub),
    taxAmount: money(taxAmt),
    total: money(grandTotal),
    mrpTotal: money(mrpGrandTotal),
    cartHasDiscount,
    savePercent: mrpGrandTotal > 0 ? Math.round((1 - grandTotal / mrpGrandTotal) * 100) + '%' : '0%',
    shippingFee: money(75),
    payTotal: money(grandTotal + 75),
    volumeDiscount: money(disc),
    hasVolumeDiscount: disc > 0.005,
  };
}

// Ported verbatim from the source's canned Checkout delivery address (line 2271) — a UK-style
// pharmacy name over an Indian city/pincode/phone, unchanged mismatch from the source itself, not a
// bug to fix.
export const deliveryAddress = {
  name: 'Harrow Street Pharmacy',
  city: 'Bengaluru',
  line: 'Bengaluru, Karnataka 560001',
  phone: '9198208114',
};
