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

// Called by Cart's own +/-/remove (cartApi.ts's updateQuantity) right after a successful real
// mutation - that call site writes to the real cart directly (its own line-item id, not a
// hashId/variantId lookup) and never went through this module at all, so this cache had no way
// to know a line it removed was gone. The next Add/Inc tap for that SAME product from Home/
// Product Detail would then find this stale (already-deleted) id still cached and try to update
// it - confirmed live via ngrok trace: a 404 on POST .../line-items/<dead-id>, silently caught
// and logged by syncCartQuantityOnce below, so the tap's local optimistic "added" UI never
// actually reached the real cart. `lineItemId: null` clears the entry (a real remove); a string
// value re-seeds it (a real quantity update) so cache and server agree either way.
export function setLineItemCache(hashId: number, lineItemId: string | null): void {
  if (lineItemId) lineItemIdByHashId.set(hashId, lineItemId);
  else lineItemIdByHashId.delete(hashId);
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
  cartMutationChain = Promise.resolve();
}

// SINGLE global queue for every real-cart-mutating call in the app - not per-product. Confirmed
// live (direct backend test) that Medusa's cart line-item write is NOT safe under concurrent
// requests to the same cart: firing 6 concurrent add-line-item calls at one cart (different
// variants each) silently lost more than half of them (3 of 6 persisted); running the exact same
// 6 calls strictly one-at-a-time persisted all 6, every time. A per-hashId queue (the previous
// version of this file) only serializes same-PRODUCT calls against each other - two different
// products still raced against each other and could still lose one. Every add/inc/dec
// (syncCartQuantity below) AND Cart's own +/-/remove (cartApi.ts's updateQuantity, routed
// through runCartMutation) now share this one chain, so no two writes to the real cart - from
// anywhere in the app - ever run concurrently.
let cartMutationChain: Promise<void> = Promise.resolve();

// Queues `fn` behind every cart mutation already in flight (from anywhere in the app) and returns
// its own result/rejection to the caller - the shared chain itself never rejects (a failed
// mutation doesn't wedge the next caller's turn), but the caller still sees the real outcome.
export function runCartMutation<T>(fn: () => Promise<T>): Promise<T> {
  const result = cartMutationChain.then(fn);
  cartMutationChain = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

// Fire-and-forget: the caller has already updated local cart state optimistically (same as
// every other add/inc/dec in this app today), so a sync failure here is logged, not surfaced -
// mirrors the backend's own "notify, don't block" convention for non-critical side effects.
export function syncCartQuantity(hashId: number, quantity: number): Promise<void> {
  return runCartMutation(() => syncCartQuantityOnce(hashId, quantity));
}

// Cart's own reload() (cartApi.ts) fetches the real cart independently of whatever add/inc/dec
// mutation is still in flight from wherever the user just tapped Add - since syncCartQuantity is
// intentionally fire-and-forget (the caller's local optimistic state is already updated, it
// doesn't wait around), navigating to Cart fast enough can fetch the server cart BEFORE that add
// has actually landed, showing "No cases yet" for an item that really is about to be there.
// Awaiting the shared chain here (right before Cart's own fetch) closes that race without turning
// every add/inc/dec elsewhere in the app into a blocking call.
export function waitForPendingCartSyncs(): Promise<void> {
  return cartMutationChain.catch(() => {});
}

async function syncCartQuantityOnce(hashId: number, quantity: number): Promise<void> {
  try {
    const cartId = await ensureCartId();
    const existingLineItemId = lineItemIdByHashId.get(hashId);

    if (existingLineItemId) {
      try {
        if (quantity <= 0) {
          await removeLineItem(cartId, existingLineItemId);
          lineItemIdByHashId.delete(hashId);
        } else {
          await updateLineItemQuantity(cartId, existingLineItemId, quantity);
        }
        return;
      } catch (err) {
        // The cached id no longer exists on the real cart (confirmed live: a 404 here, from a
        // line removed through a path that doesn't share this cache - e.g. Cart's own remove
        // button before setLineItemCache existed). Don't just log and give up on the write -
        // drop the dead entry and fall through to re-resolve against the REAL cart below,
        // instead of silently losing whatever the user just tapped.
        console.warn('[cartSync] cached line item is stale, re-resolving against the real cart', err);
        lineItemIdByHashId.delete(hashId);
      }
    }

    if (quantity <= 0) return;
    const variantId = variantIdByHashId.get(hashId);
    if (!variantId) {
      console.warn(`[cartSync] no variant registered for product ${hashId}, skipping sync`);
      return;
    }
    // Don't assume "no cached line item id" means "no real line yet" - the shared queue above
    // rules out any concurrent write racing this one, but the cache can still be cold for other
    // reasons (a fresh app restart before hydrateCartState finishes, a variant registered
    // moments ago by a still-settling earlier call, or the stale-cache fallback just above).
    // Re-check the real cart first: Medusa's add-line-item endpoint is additive (confirmed live -
    // adding qty 3 to an existing qty 1 line makes it 4, not 3, it does NOT set the line to 3),
    // so blindly calling it when a real line already exists silently inflates the cart past what
    // the quantity here (an absolute desired total) says it should be.
    const currentCart = await fetchCart(cartId);
    const existingRemote = currentCart.items.find((i) => i.variant_id === variantId);
    if (existingRemote) {
      lineItemIdByHashId.set(hashId, existingRemote.id);
      await updateLineItemQuantity(cartId, existingRemote.id, quantity);
    } else {
      const cart = await addLineItem(cartId, variantId, quantity);
      const item = cart.items.find((i) => i.variant_id === variantId);
      if (item) lineItemIdByHashId.set(hashId, item.id);
    }
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
