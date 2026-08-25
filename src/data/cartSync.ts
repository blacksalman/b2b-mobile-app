import AsyncStorage from '@react-native-async-storage/async-storage';
import { createCart, addLineItem, updateLineItemQuantity, removeLineItem, fetchCart } from '@/lib/medusaCart';
import { registerProduct } from './productRegistry';
import { hashProductId } from './idHash';
import type { CartState, Product } from './types';

// Bridges the app's existing local numeric-keyed cart (AppStateContext - untouched by this) to
// a real Medusa cart, for API-backed product cards only (mock products like Buy again/
// Fast-moving have no real variant to add). Keyed by the same hashed numeric id (idHash.ts)
// already used everywhere else in the UI layer, so callers never need to look up the real
// string product/variant id themselves.
//
// The cart id IS persisted now (AsyncStorage - works on web via localStorage and on native),
// unlike AppStateContext's own cart/wishlist/login state, which stays intentionally
// unpersisted (its own comment: "resets on every fresh app load"). A real cart needs to survive
// a refresh - that's the whole point of using Medusa's cart instead of just local state - so
// this one module diverges from that convention on purpose.
const CART_ID_STORAGE_KEY = 'medusa_cart_id';

let cartIdPromise: Promise<string> | null = null;
const lineItemIdByHashId = new Map<number, string>();
const variantIdByHashId = new Map<number, string>();

async function ensureCartId(): Promise<string> {
  if (!cartIdPromise) {
    cartIdPromise = (async () => {
      const persisted = await AsyncStorage.getItem(CART_ID_STORAGE_KEY);
      if (persisted) {
        try {
          const cart = await fetchCart(persisted);
          if (!cart.completed_at) return cart.id;
          // Already turned into an order - fall through and create a fresh one.
        } catch {
          // Persisted id is stale/invalid - fall through and create a fresh one.
        }
      }
      const cart = await createCart();
      await AsyncStorage.setItem(CART_ID_STORAGE_KEY, cart.id);
      return cart.id;
    })();
  }
  return cartIdPromise;
}

// Called once per API-backed product as it's decorated (see toRailProduct in homeApi.ts) so a
// variant id is on hand by the time the user can actually press Add/Inc/Dec.
export function registerApiProductVariant(hashId: number, variantId: string): void {
  variantIdByHashId.set(hashId, variantId);
}

// Exposed for Checkout - it needs the same real cart id every other add/inc/dec on this device
// already resolves to, to run the shipping/payment/complete sequence against it.
export function getCartId(): Promise<string> {
  return ensureCartId();
}

// Called right after a cart is completed into a real order (checkout.tsx) - a completed cart
// can't be added to again, so this drops the persisted id and local line-item/variant maps and
// lets the next add-to-cart create a fresh one, same as hydrateCartState already does when it
// finds a stale completed cart on app boot.
export async function resetCartAfterOrder(): Promise<void> {
  await AsyncStorage.removeItem(CART_ID_STORAGE_KEY);
  cartIdPromise = null;
  lineItemIdByHashId.clear();
  variantIdByHashId.clear();
  syncChainByHashId.clear();
}

// Per-hashId queue - serializes concurrent syncCartQuantity calls for the SAME product so a
// rapid double-tap can't run two overlapping syncs at once (see syncCartQuantity's own comment
// for the exact bug this fixes). Calls for different products still run independently/in
// parallel, only same-product calls chain behind each other.
const syncChainByHashId = new Map<number, Promise<void>>();

// Fire-and-forget: the caller has already updated local cart state optimistically (same as
// every other add/inc/dec in this app today), so a sync failure here is logged, not surfaced -
// mirrors the backend's own "notify, don't block" convention for non-critical side effects.
export function syncCartQuantity(hashId: number, quantity: number): Promise<void> {
  const previous = syncChainByHashId.get(hashId) ?? Promise.resolve();
  // .catch(() => {}) so one failed sync doesn't permanently wedge this product's queue - the
  // next call still gets its own fresh attempt instead of inheriting a rejected chain forever.
  const next = previous.catch(() => {}).then(() => syncCartQuantityOnce(hashId, quantity));
  syncChainByHashId.set(hashId, next);
  return next;
}

async function syncCartQuantityOnce(hashId: number, quantity: number): Promise<void> {
  try {
    const cartId = await ensureCartId();
    let existingLineItemId = lineItemIdByHashId.get(hashId);

    if (!existingLineItemId) {
      if (quantity <= 0) return;
      const variantId = variantIdByHashId.get(hashId);
      if (!variantId) {
        console.warn(`[cartSync] no variant registered for product ${hashId}, skipping sync`);
        return;
      }
      // Don't assume "no cached line item id" means "no real line yet" - the queue above rules
      // out a same-product race, but the cache can still be cold for other reasons (a fresh app
      // restart before hydrateCartState finishes, a variant registered moments ago by a
      // still-settling earlier call). Re-check the real cart first: Medusa's add-line-item
      // endpoint is additive (confirmed live - adding qty 3 to an existing qty 1 line makes it
      // 4, not 3, it does NOT set the line to 3), so blindly calling it when a real line already
      // exists silently inflates the cart past what the quantity here (an absolute desired
      // total) says it should be - that drift is exactly what left Cart's real quantity higher
      // than what the tapped-from screen showed.
      const currentCart = await fetchCart(cartId);
      const existingRemote = currentCart.items.find((i) => i.variant_id === variantId);
      if (existingRemote) {
        lineItemIdByHashId.set(hashId, existingRemote.id);
        existingLineItemId = existingRemote.id;
      } else {
        const cart = await addLineItem(cartId, variantId, quantity);
        const item = cart.items.find((i) => i.variant_id === variantId);
        if (item) lineItemIdByHashId.set(hashId, item.id);
        return;
      }
    }

    if (quantity <= 0) {
      await removeLineItem(cartId, existingLineItemId);
      lineItemIdByHashId.delete(hashId);
      return;
    }

    await updateLineItemQuantity(cartId, existingLineItemId, quantity);
  } catch (err) {
    console.warn('[cartSync] failed to sync cart quantity', err);
  }
}

// Called once on app start (AppStateProvider) to restore whatever was in the persisted cart
// before this reload. Re-seeds this module's own line-item/variant maps directly from the
// fetched cart (so a subsequent inc/dec doesn't try to re-add an item that already exists
// server-side) and also registers each item into productRegistry using the cart's own
// product_title/variant_title/unit_price - the same fields Cart/mini-cart need - so totals are
// correct immediately, without waiting for Home to fetch and decorate its sections first.
export async function hydrateCartState(): Promise<CartState> {
  try {
    const persisted = await AsyncStorage.getItem(CART_ID_STORAGE_KEY);
    if (!persisted) return {};

    const cart = await fetchCart(persisted);
    if (cart.completed_at) {
      await AsyncStorage.removeItem(CART_ID_STORAGE_KEY);
      return {};
    }
    cartIdPromise = Promise.resolve(cart.id);

    const state: CartState = {};
    for (const item of cart.items) {
      const hashId = hashProductId(item.product_id);
      lineItemIdByHashId.set(hashId, item.id);
      variantIdByHashId.set(hashId, item.variant_id);
      state[hashId] = item.quantity;

      const product: Product = {
        id: hashId,
        name: item.product_title,
        brand: '',
        cs: item.variant_title,
        price: item.unit_price,
        tint: '#F5F5F5',
        cat: '',
        gated: false,
        thumbnail: item.thumbnail,
      };
      registerProduct(product);
    }
    return state;
  } catch (err) {
    console.warn('[cartSync] failed to hydrate cart from storage', err);
    return {};
  }
}
