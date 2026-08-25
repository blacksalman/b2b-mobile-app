import { useAppState } from '@/state/AppStateContext';
import { syncCartQuantity } from './cartSync';
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
  const incApiProduct = (p: DecoratedProduct) => {
    inc(p.id);
    syncCartQuantity(p.id, p.cartQty + 1);
  };
  const decApiProduct = (p: DecoratedProduct) => {
    dec(p.id);
    syncCartQuantity(p.id, Math.max(0, p.cartQty - 1));
  };

  return { addApiProduct, incApiProduct, decApiProduct };
}
