import { DEFAULT_REGION_ID, storeFetch, storeMutate } from './medusaClient';

// Medusa's native cart module/store API (confirmed present, uncustomized, and live-tested
// against this backend - see the "does native cart logic exist" conversation): cart creation,
// line-item add/update/remove, and fetch-by-id (for rehydrating a persisted cart on app
// reload), nothing else built server-side for this.
export interface MedusaCartLineItem {
  id: string;
  variant_id: string;
  product_id: string;
  product_title: string;
  variant_title: string;
  thumbnail: string | null;
  unit_price: number;
  quantity: number;
}

export interface MedusaCart {
  id: string;
  region_id: string;
  completed_at: string | null;
  items: MedusaCartLineItem[];
}

export function fetchCart(cartId: string): Promise<MedusaCart> {
  return storeFetch<{ cart: MedusaCart }>(`/store/carts/${cartId}`).then((d) => d.cart);
}

export function createCart(): Promise<MedusaCart> {
  return storeMutate<{ cart: MedusaCart }>('/store/carts', 'POST', { region_id: DEFAULT_REGION_ID }).then(
    (d) => d.cart
  );
}

export function addLineItem(cartId: string, variantId: string, quantity: number): Promise<MedusaCart> {
  return storeMutate<{ cart: MedusaCart }>(`/store/carts/${cartId}/line-items`, 'POST', {
    variant_id: variantId,
    quantity,
  }).then((d) => d.cart);
}

export function updateLineItemQuantity(cartId: string, lineItemId: string, quantity: number): Promise<MedusaCart> {
  return storeMutate<{ cart: MedusaCart }>(`/store/carts/${cartId}/line-items/${lineItemId}`, 'POST', {
    quantity,
  }).then((d) => d.cart);
}

export function removeLineItem(cartId: string, lineItemId: string): Promise<MedusaCart> {
  return storeMutate<{ cart: MedusaCart }>(`/store/carts/${cartId}/line-items/${lineItemId}`, 'DELETE').then(
    (d) => d.cart
  );
}
