import { useAppState } from '@/state/AppStateContext';
import { syncCartQuantity, getVariantIdByHashId } from './cartSync';
import { fetchVariantStock } from '@/lib/medusaClient';
import type { DecoratedProduct } from './types';

function addFlashLabel(name: string): string {
  return name.split(' ').slice(0, 2).join(' ') + ' added';
}

// Shared by every screen with API-backed product cards (Home, Search, ...): local
// AppStateContext state stays the source of truth for what renders (same optimistic-update
// behavior as every other add/inc/dec in this app), while each call also fires the matching
// real Medusa cart mutation (cartSync.ts). Mock-catalog cards (Buy again, Fast-moving) don't
// use this - they have no real variant to sync and keep calling addToCart/inc/dec directly.
// Typed against DecoratedProduct (not RailProduct) - every field these three functions actually
// read (id/name/cartQty) lives there already; RailProduct's extra rating/margin/brandUpper/
// discount fields are irrelevant here and every existing RailProduct call site is still a valid
// DecoratedProduct, so this is a widening, not a behavior change. VariantSheet's real-variant
// rows are plain decorateProduct() output with no rating/margin/etc, so they need this to be
// callable without fabricating those fields just to satisfy the type.
export function useApiCartActions() {
  const { addToCart, inc, dec, flash } = useAppState();

  const addApiProduct = (p: DecoratedProduct) => {
    addToCart(p.id, 1);
    flash(addFlashLabel(p.name));
    syncCartQuantity(p.id, p.cartQty + 1);
  };
  // A real, per-tap stock check (not the app's own cached inStock boolean, which only ever means
  // ">0 somewhere") - the previous version incremented unconditionally, letting a customer tap +
  // past what's actually available. `await`-able so the caller (DsProductCard etc.) can show a
  // loading state on the stepper while this is in flight; returns nothing useful itself since
  // the reject case is already surfaced via flash() here, same toast mechanism as every other
  // message in this app - the caller only needs to know when the promise settles.
  const incApiProduct = async (p: DecoratedProduct) => {
    const variantId = getVariantIdByHashId(p.id);
    if (variantId) {
      try {
        const stock = await fetchVariantStock(variantId);
        const nextQty = p.cartQty + 1;
        if (!stock.unlimited && (stock.available ?? 0) < nextQty) {
          flash(`Only ${stock.available ?? 0} in stock`);
          return;
        }
      } catch {
        // Stock check itself failed (network hiccup, etc.) - fall through and allow the
        // increment rather than blocking the user over a transient error unrelated to stock.
      }
    }
    inc(p.id);
    syncCartQuantity(p.id, p.cartQty + 1);
  };
  const decApiProduct = (p: DecoratedProduct) => {
    dec(p.id);
    syncCartQuantity(p.id, Math.max(0, p.cartQty - 1));
  };

  return { addApiProduct, incApiProduct, decApiProduct };
}
