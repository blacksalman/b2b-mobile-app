import { useAppState } from '@/state/AppStateContext';
import { syncCartQuantity } from './cartSync';
import type { RailProduct } from './home-content';

function addFlashLabel(name: string): string {
  return name.split(' ').slice(0, 2).join(' ') + ' added';
}

// Shared by every screen with API-backed product cards (Home, Search, ...): local
// AppStateContext state stays the source of truth for what renders (same optimistic-update
// behavior as every other add/inc/dec in this app), while each call also fires the matching
// real Medusa cart mutation (cartSync.ts). Mock-catalog cards (Buy again, Fast-moving) don't
// use this - they have no real variant to sync and keep calling addToCart/inc/dec directly.
export function useApiCartActions() {
  const { addToCart, inc, dec, flash } = useAppState();

  const addApiProduct = (p: RailProduct) => {
    addToCart(p.id, 1);
    flash(addFlashLabel(p.name));
    syncCartQuantity(p.id, p.cartQty + 1);
  };
  const incApiProduct = (p: RailProduct) => {
    inc(p.id);
    syncCartQuantity(p.id, p.cartQty + 1);
  };
  const decApiProduct = (p: RailProduct) => {
    dec(p.id);
    syncCartQuantity(p.id, Math.max(0, p.cartQty - 1));
  };

  return { addApiProduct, incApiProduct, decApiProduct };
}
