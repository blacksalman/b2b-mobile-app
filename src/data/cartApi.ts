import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  fetchCart,
  updateLineItemQuantity,
  removeLineItem,
  type MedusaCart,
  type MedusaCartLineItem,
} from '@/lib/medusaCart';
import { fetchProductsByIds, type MedusaProduct, type MedusaVariant } from '@/lib/medusaClient';
import { getCartId, waitForPendingCartSyncs } from './cartSync';
import { money } from '@/utils/money';

// Real Cart page / mini-cart data - replaces the old local computeCartTotals (cartTotals.ts),
// which computed everything (price, MRP, discount%, tax, a "volume discount") from scratch on
// the client using the mock catalog's/productRegistry's own numbers. That fell apart for real
// products: productRegistry is in-memory only and hydrateCartState rebuilds a bare-minimum
// Product on every app restart with no MRP/discount data at all, so real discounts silently
// vanished; the "volume discount" tiers (10%/20% off arbitrary subtotal thresholds) were never
// real to begin with. This instead fetches the actual Medusa cart directly (real unit_price -
// already resolved server-side against quantity-tier pricing, confirmed live - real
// compare_at_unit_price for genuine MRP markdowns, real thumbnail, real subtotal/tax) and reads
// straight off that. `total` here deliberately excludes shipping (not resolved until a shipping
// method is chosen at Checkout) - same "Calculated at checkout" chip the UI already showed.
export interface RealCartLine {
  id: string;
  productId: string;
  name: string;
  brand: string;
  cs: string;
  thumbnail: string | null;
  qty: number;
  unitPrice: number;
  unitMrp?: number;
  lineTotal: number;
  lineMrpTotal?: number;
  unitPriceLabel: string;
  unitMrpLabel?: string;
  lineTotalLabel: string;
  lineMrpTotalLabel?: string;
  discountLabel?: string;
  hasDiscount: boolean;
}

export interface RealCartData {
  loading: boolean;
  error: boolean;
  cartId: string | null;
  lines: RealCartLine[];
  cartEmpty: boolean;
  cartHasItems: boolean;
  itemCount: number;
  subtotalLabel: string;
  taxLabel: string;
  totalLabel: string;
  // Real aggregate MRP total across every line that has a genuine per-line discount (MRP-based
  // or quantity-tier-based, see buildLine) - undefined when no line has one. Deliberately no
  // aggregate "% off" alongside it: a single blended percentage across lines with different
  // (or zero) discounts doesn't correspond to any one product and reads as misleading - each
  // line's own real discount% is shown on that line instead (CartLineCard).
  hasDiscount: boolean;
  mrpTotalLabel?: string;
}

const EMPTY: RealCartData = {
  loading: true,
  error: false,
  cartId: null,
  lines: [],
  cartEmpty: true,
  cartHasItems: false,
  itemCount: 0,
  subtotalLabel: money(0),
  taxLabel: money(0),
  totalLabel: money(0),
  hasDiscount: false,
};

// Same real quantity-discount tier extraction homeApi.ts's toProduct uses (admin's "Quantity
// Discount" widget: extra price rows on the variant with min_quantity/max_quantity, no
// price_list_id) - returns the qty=1 baseline price when there's more than one real tier row,
// i.e. a genuine tier discount exists to compare the cart's current (already tier-resolved)
// unit_price against.
function tierBaselinePrice(variant: MedusaVariant | undefined): number | undefined {
  const tiers = (variant?.prices ?? [])
    .filter((p) => p.currency_code === 'inr' && !p.price_list_id)
    .sort((a, b) => (a.min_quantity ?? 0) - (b.min_quantity ?? 0));
  return tiers.length > 1 ? tiers[0].amount : undefined;
}

// `product` is the full real product this line belongs to (batch-fetched in reload() below) -
// used only to find a quantity-tier baseline when the line has no real MRP of its own. A
// product genuinely can have real tiers with no MRP markdown at all (confirmed live, e.g. Nurall
// Capsule: 3+ units drops the price with no compare_at_unit_price set) - Cart previously only
// recognized the MRP case, so a real, active tier discount like that one showed no strike-through
// at all even though Home/Product Detail already showed it for the same product.
function buildLine(item: MedusaCartLineItem, product: MedusaProduct | undefined): RealCartLine {
  const realMrp = item.compare_at_unit_price ?? undefined;
  const tierBaseline = realMrp === undefined ? tierBaselinePrice(product?.variants?.find((v) => v.id === item.variant_id)) : undefined;
  const mrp = realMrp ?? (tierBaseline && tierBaseline > item.unit_price ? tierBaseline : undefined);
  const hasDiscount = mrp !== undefined && mrp > item.unit_price;
  const lineTotal = item.unit_price * item.quantity;
  const lineMrpTotal = hasDiscount ? mrp! * item.quantity : undefined;
  // The real cart's own automatic tax calculation already resolved this exact line's GST rate
  // (confirmed live, e.g. tax_lines: [{rate: 5, code: "gst-5"}]) - applied to the DISPLAY labels
  // only, so a line reads the same tax-included number Home/Product Detail already show for this
  // product. `unitPrice`/`lineTotal`/etc (the raw numbers) stay tax-exclusive, matching the real
  // Order summary's Subtotal/Tax/Total rows below, which are already correct as-is.
  const taxMult = 1 + (item.tax_lines?.reduce((sum, t) => sum + t.rate, 0) ?? 0) / 100;
  return {
    id: item.id,
    productId: item.product_id,
    name: item.product_title,
    brand: item.product_collection ?? '',
    cs: item.variant_title,
    thumbnail: item.thumbnail,
    qty: item.quantity,
    unitPrice: item.unit_price,
    unitMrp: hasDiscount ? mrp! : undefined,
    lineTotal,
    lineMrpTotal,
    unitPriceLabel: money(item.unit_price * taxMult),
    unitMrpLabel: hasDiscount ? money(mrp! * taxMult) : undefined,
    lineTotalLabel: money(lineTotal * taxMult),
    lineMrpTotalLabel: hasDiscount ? money(lineMrpTotal! * taxMult) : undefined,
    discountLabel: hasDiscount ? '-' + Math.round((1 - item.unit_price / mrp!) * 100) + '%' : undefined,
    hasDiscount,
  };
}

function buildCartData(cart: MedusaCart | null, productsById: Map<string, MedusaProduct>, loading: boolean, error: boolean): RealCartData {
  if (!cart) return { ...EMPTY, loading, error };
  const lines = cart.items.map((item) => buildLine(item, productsById.get(item.product_id)));
  const hasDiscount = lines.some((l) => l.hasDiscount);
  // item_subtotal/item_tax_total/item_total (not the plain subtotal/tax_total/total fields) -
  // see MedusaCart's own comment: those stay items-only even once Checkout has attached a
  // shipping method to this same cart, which plain `subtotal` does not.
  const mrpTotal = hasDiscount
    ? lines.reduce((sum, l) => sum + (l.hasDiscount ? l.lineMrpTotal! : l.lineTotal), 0) + cart.item_tax_total
    : undefined;

  return {
    loading: false,
    error,
    cartId: cart.id,
    lines,
    cartEmpty: lines.length === 0,
    cartHasItems: lines.length > 0,
    itemCount: lines.reduce((n, l) => n + l.qty, 0),
    subtotalLabel: money(cart.item_subtotal),
    taxLabel: money(cart.item_tax_total),
    totalLabel: money(cart.item_total),
    hasDiscount,
    mrpTotalLabel: mrpTotal !== undefined ? money(mrpTotal) : undefined,
  };
}

export interface UseRealCartResult extends RealCartData {
  reload: () => Promise<void>;
  updateQuantity: (lineId: string, quantity: number) => Promise<void>;
}

export function useRealCart(): UseRealCartResult {
  const [cart, setCart] = useState<MedusaCart | null>(null);
  const [productsById, setProductsById] = useState<Map<string, MedusaProduct>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Ignores a response that resolves after a NEWER reload() has already started - without this,
  // two overlapping fetches (e.g. a fast focus-triggered reload racing a slower one still in
  // flight from just before) could let the slower, now-stale response overwrite the fresher one.
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const myRequestId = ++requestId.current;
    setLoading(true);
    try {
      // Let any add/inc/dec still in flight from wherever the user just tapped land first - see
      // waitForPendingCartSyncs' own comment for the exact race this closes.
      await waitForPendingCartSyncs();
      const cartId = await getCartId();
      const fresh = await fetchCart(cartId);
      const products = fresh.items.length ? await fetchProductsByIds([...new Set(fresh.items.map((i) => i.product_id))]) : [];
      if (myRequestId !== requestId.current) return;
      setCart(fresh);
      setProductsById(new Map(products.map((p) => [p.id, p] as const)));
      setError(false);
    } catch {
      if (myRequestId === requestId.current) setError(true);
    } finally {
      if (myRequestId === requestId.current) setLoading(false);
    }
  }, []);

  // Re-fetches every time Cart regains focus, not just on first mount - items are usually added
  // from a different screen entirely, so a mount-only fetch would keep showing whatever was true
  // the first time this screen ever opened.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const updateQuantity = useCallback(
    async (lineId: string, quantity: number) => {
      if (!cart) return;
      const updated = quantity <= 0 ? await removeLineItem(cart.id, lineId) : await updateLineItemQuantity(cart.id, lineId, quantity);
      setCart(updated);
    },
    [cart]
  );

  return { ...buildCartData(cart, productsById, loading, error), reload, updateQuantity };
}
