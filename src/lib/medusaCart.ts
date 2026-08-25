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
  product_collection: string | null;
  thumbnail: string | null;
  unit_price: number;
  // Native Medusa field - the item's pre-discount/MRP unit price, null when there isn't a real
  // markdown on this line (confirmed live: null for a product only discounted via quantity-tier
  // pricing, set for a genuine MRP-vs-sale-price product). This is what backs Cart's real
  // strike-through MRP/discount%, not a locally-recomputed guess.
  compare_at_unit_price: number | null;
  quantity: number;
}

export interface MedusaCartAddress {
  first_name: string;
  last_name?: string | null;
  company?: string | null;
  address_1: string;
  address_2?: string | null;
  city: string;
  province?: string | null;
  postal_code: string;
  country_code: string;
  phone?: string | null;
}

export interface MedusaCart {
  id: string;
  region_id: string;
  email: string | null;
  completed_at: string | null;
  items: MedusaCartLineItem[];
  shipping_address: MedusaCartAddress | null;
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  tax_total: number;
  total: number;
  currency_code: string;
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

// Checkout completion (docs/STORE_API.md section 6) - all native. Real online payment
// (Razorpay's Checkout.js widget) needs a card-tokenizing UI the customer taps through, deferred
// per the "I will pay later" decision - for now every order completes via the backend's built-in
// "system"/manual payment provider (pp_system_default, confirmed enabled on the India region
// alongside pp_razorpay_razorpay), i.e. a real order with no online payment collected. Swapping
// in the Razorpay widget later only touches createPaymentSession's provider_id + a widget step
// between that call and completeCart - nothing else in this file changes.
const SYSTEM_PAYMENT_PROVIDER_ID = 'pp_system_default';

export interface MedusaShippingOption {
  id: string;
  name: string;
  amount: number;
}

export function fetchShippingOptions(cartId: string): Promise<MedusaShippingOption[]> {
  return storeFetch<{ shipping_options: { id: string; name: string; amount: number }[] }>('/store/shipping-options', {
    cart_id: cartId,
  }).then((d) => d.shipping_options.map((o) => ({ id: o.id, name: o.name, amount: o.amount })));
}

export function addShippingMethod(cartId: string, optionId: string): Promise<MedusaCart> {
  return storeMutate<{ cart: MedusaCart }>(`/store/carts/${cartId}/shipping-methods`, 'POST', {
    option_id: optionId,
  }).then((d) => d.cart);
}

export function setCartAddress(cartId: string, email: string, address: MedusaCartAddress): Promise<MedusaCart> {
  return storeMutate<{ cart: MedusaCart }>(`/store/carts/${cartId}`, 'POST', {
    email,
    shipping_address: address,
    billing_address: address,
  }).then((d) => d.cart);
}

export async function createSystemPaymentSession(cartId: string): Promise<void> {
  const { payment_collection } = await storeMutate<{ payment_collection: { id: string } }>('/store/payment-collections', 'POST', {
    cart_id: cartId,
  });
  await storeMutate(`/store/payment-collections/${payment_collection.id}/payment-sessions`, 'POST', {
    provider_id: SYSTEM_PAYMENT_PROVIDER_ID,
  });
}

export interface MedusaOrderResult {
  id: string;
  display_id: number;
  total: number;
  currency_code: string;
}

export type CompleteCartResult = { type: 'order'; order: MedusaOrderResult } | { type: 'cart'; error: string };

export async function completeCart(cartId: string): Promise<CompleteCartResult> {
  const data = await storeMutate<
    | { type: 'order'; order: MedusaOrderResult }
    | { type: 'cart'; cart: MedusaCart; error: { message: string } }
  >(`/store/carts/${cartId}/complete`, 'POST');
  if (data.type === 'order') return { type: 'order', order: data.order };
  return { type: 'cart', error: data.error.message };
}
