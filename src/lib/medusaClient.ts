// Thin fetch wrapper around the Medusa backend's Store API (apps/backend in
// B2b_Backend_On_Medusa). Only the endpoints the app has actually started wiring up live
// here - add more as more screens get connected (see AGENTS.md / CLAUDE.md conversation:
// wiring happens page by page, section by section, not all at once).

import { getAuthHeader } from './authToken';

const BASE_URL = process.env.EXPO_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? '';
export const DEFAULT_REGION_ID = process.env.EXPO_PUBLIC_MEDUSA_REGION_ID ?? '';
// Razorpay's public key id - safe to ship client-side (see .env's own comment). Used by
// checkout.tsx to open the Razorpay Checkout WebView (razorpayCheckout.ts); must match the
// backend's RAZORPAY_KEY_ID.
export const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? '';

// ngrok's free tier serves an HTML "you're about to visit..." interstitial instead of the real
// response for any request it doesn't recognize as already-trusted, which would otherwise
// silently break every fetch below (JSON.parse on an HTML page) whenever BASE_URL points at an
// ngrok tunnel (see the "test from outside the Wi-Fi" conversation). Harmless no-op against a
// plain LAN/localhost backend, so this is always sent rather than only when tunneling.
const COMMON_HEADERS = { 'ngrok-skip-browser-warning': 'true' };

// GET-with-query-params helper - every read endpoint in this file uses this (also used
// directly by medusaCart.ts's fetchCart, which needs no query params).
export async function storeFetch<T>(path: string, params?: Record<string, string | string[] | undefined>): Promise<T> {
  const qs = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        value.forEach((v) => qs.append(`${key}[]`, v));
      } else {
        qs.set(key, value);
      }
    }
  }
  const query = qs.toString();
  const res = await fetch(`${BASE_URL}${path}${query ? `?${query}` : ''}`, {
    headers: { ...COMMON_HEADERS, 'x-publishable-api-key': PUBLISHABLE_KEY, ...getAuthHeader() },
  });
  if (!res.ok) {
    throw new Error(`Medusa store API ${path} failed: ${res.status}`);
  }
  return res.json();
}

// POST/DELETE-with-JSON-body helper - used by medusaCart.ts's cart/line-item mutations, and by
// medusaAuth.ts for the phone-OTP send/register/session + customer-creation calls (the customer
// token, once set via authToken.ts's setToken, rides along automatically here too - e.g. POST
// /store/customers needs the interim registration token as Bearer, which this picks up with no
// extra plumbing at the call site).
export async function storeMutate<T>(path: string, method: 'POST' | 'DELETE', body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { ...COMMON_HEADERS, 'x-publishable-api-key': PUBLISHABLE_KEY, 'Content-Type': 'application/json', ...getAuthHeader() },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`Medusa store API ${path} failed: ${res.status}`);
  }
  return res.json();
}

// Same as storeMutate, but returns the parsed JSON body even on a non-2xx response instead of
// throwing - for endpoints (reviewsApi.ts's submitReview) whose 4xx responses are expected,
// meaningful outcomes with a real user-facing `message` (e.g. "you've already reviewed this
// product"), not just an unexpected-failure case that should be swallowed into a generic error.
export async function storeMutateExpectingError<T>(
  path: string,
  method: 'POST' | 'DELETE',
  body?: Record<string, unknown>
): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { ...COMMON_HEADERS, 'x-publishable-api-key': PUBLISHABLE_KEY, 'Content-Type': 'application/json', ...getAuthHeader() },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

export interface MedusaProductSection {
  id: string;
  slug: string;
  title: string;
  rank: number;
  products: { id: string; title: string; handle: string; thumbnail: string | null }[];
}

export function fetchProductSections(): Promise<{ product_sections: MedusaProductSection[] }> {
  return storeFetch('/store/product-sections');
}

export interface MedusaCategorySection {
  id: string;
  slug: string;
  title: string;
  rank: number;
  categories: { id: string; name: string; handle: string }[];
}

export function fetchCategorySections(slug?: string): Promise<{ category_sections: MedusaCategorySection[] }> {
  return storeFetch('/store/category-sections', { slug });
}

export interface MedusaBanner {
  id: string;
  target_type: string;
  target_id: string | null;
  rank: number;
  [key: string]: unknown;
}

export function fetchBanners(targetType: string, targetId?: string): Promise<{ banners: MedusaBanner[] }> {
  return storeFetch('/store/banners', { target_type: targetType, target_id: targetId });
}

export interface MedusaPolicy {
  id: string;
  key: string;
  title: string;
  body: string;
  rank: number;
}

// Backs Account's "Policies"/"About" sections and Checkout's Return/Shipping popups (see
// account-content.ts's usePolicies) - admin-managed content (Operations > Policies), replacing
// what used to be a hardcoded POLICIES object in this file's own account-content.ts.
export function fetchPolicies(): Promise<{ policies: MedusaPolicy[] }> {
  return storeFetch('/store/policies');
}

export interface MedusaCollection {
  id: string;
  title: string;
  handle: string;
}

export function fetchCollections(): Promise<{ collections: MedusaCollection[] }> {
  return storeFetch('/store/collections', { limit: '100' });
}

// Admin-curated brand groups (Operations > Brand Sections in admin) - same curation mechanism as
// category-sections/product-sections, just holding collection ids instead. Backs the Home
// screen's "Brands" rail (slug "home-brands") so it shows only the brands an admin picked instead
// of every collection in the catalog (~390 after the Aug 2026 cleanup restore - see
// fetchCollectionProductCounts's comment for why that mattered for performance too).
export interface MedusaBrandSection {
  id: string;
  slug: string;
  title: string;
  rank: number;
  brands: MedusaCollection[];
}

export function fetchBrandSections(slug?: string): Promise<{ brand_sections: MedusaBrandSection[] }> {
  return storeFetch('/store/brand-sections', { slug });
}

// Batched product count per collection - one request for every brand card's SKU count instead
// of one products-search call per collection (was ~100 concurrent requests from the phone once
// the Aug 2026 cleanup restore brought collections back up from 2 to ~390 - see
// src/api/store/collections/product-counts/route.ts in the backend for why this exists instead
// of the old per-id products-search trick). Returns 0 for any id with no published products.
export async function fetchCollectionProductCounts(collectionIds: string[]): Promise<Record<string, number>> {
  if (!collectionIds.length) return {};
  const data = await storeFetch<{ counts: Record<string, number> }>('/store/collections/product-counts', {
    ids: collectionIds.join(','),
  });
  return data.counts;
}

export interface MedusaVariantPrice {
  calculated_amount: number;
  original_amount: number;
  currency_code: string;
}

// A variant's own tiered price rows (src/admin/widgets/variant-quantity-discount.tsx - "Quantity
// Discount", e.g. "3 qty = 5% off"): extra rows on the variant with min_quantity/max_quantity,
// no price_list_id. Distinct from calculated_price/original_amount (the MRP-vs-sale-price
// concept) - a product can have real quantity tiers with no MRP discount at all, or vice versa.
export interface MedusaVariantPriceTier {
  id: string;
  amount: number;
  currency_code: string;
  min_quantity: number | null;
  max_quantity: number | null;
  price_list_id: string | null;
}

// Real stock fields - same shape/logic the backend's own /store/products-search `in_stock`
// filter uses (see isVariantInStock in src/api/store/products-search/route.ts): a variant is in
// stock if it isn't inventory-tracked, or allows backorder, or some stock location has
// available_quantity > 0.
export interface MedusaVariantInventoryLevel {
  available_quantity: number;
}

export interface MedusaVariantInventoryItem {
  inventory?: { location_levels?: MedusaVariantInventoryLevel[] };
}

export interface MedusaVariant {
  id: string;
  title: string;
  // Real per-option differentiator (e.g. "1 - 5 Yrs") - `title` above is Medusa's full variant
  // title, which for a product like this re-concatenates the whole product name plus this same
  // value (e.g. "Swarnaprashana - Ayurveda One - 1 - 5 Yrs"), unusable as a short picker label.
  options?: { value: string }[];
  calculated_price?: MedusaVariantPrice;
  prices?: MedusaVariantPriceTier[];
  manage_inventory?: boolean;
  allow_backorder?: boolean;
  inventory_items?: MedusaVariantInventoryItem[];
}

export interface MedusaProduct {
  id: string;
  title: string;
  handle: string;
  thumbnail: string | null;
  description?: string | null;
  images?: { id: string; url: string }[];
  collection?: { id: string; title: string } | null;
  categories?: { id: string; name: string }[];
  type_id?: string | null; // resolves this product's real GST rate - see taxRates.ts
  variants?: MedusaVariant[];
}

const PRODUCT_FIELDS = [
  'id',
  'title',
  'handle',
  'thumbnail',
  'description',
  'images.id',
  'images.url',
  'collection.id',
  'collection.title',
  'categories.id',
  'categories.name',
  'type_id',
  'variants.id',
  'variants.title',
  'variants.options.value',
  '*variants.calculated_price',
  'variants.prices.id',
  'variants.prices.amount',
  'variants.prices.currency_code',
  'variants.prices.min_quantity',
  'variants.prices.max_quantity',
  'variants.prices.price_list_id',
  'variants.manage_inventory',
  'variants.allow_backorder',
  'variants.inventory_items.inventory.location_levels.available_quantity',
].join(',');

// Native Medusa store product list (this backend has no custom /store/products route -
// see the "no override" finding from the scan), filtered to an explicit id[] set with
// price resolved against DEFAULT_REGION_ID. Used to hydrate product-sections' bare
// {id,title,handle,thumbnail} entries with the price/collection/category data the app's
// product card needs.
export async function fetchProductsByIds(ids: string[]): Promise<MedusaProduct[]> {
  if (!ids.length) return [];
  const data = await storeFetch<{ products: MedusaProduct[] }>('/store/products', {
    id: ids,
    region_id: DEFAULT_REGION_ID,
    fields: PRODUCT_FIELDS,
  });
  return data.products;
}

// Same native route, filtered by handle instead of id - backs product/[id].tsx's direct
// by-handle fetch (see productDetailApi.ts), which is what lets a product detail page load or
// refresh cold without depending on productRegistry having already seen this product this
// session.
export async function fetchProductByHandle(handle: string): Promise<MedusaProduct | null> {
  const data = await storeFetch<{ products: MedusaProduct[] }>('/store/products', {
    handle,
    region_id: DEFAULT_REGION_ID,
    fields: PRODUCT_FIELDS,
  });
  return data.products[0] ?? null;
}

// The backend's real search/browse endpoint (src/api/store/products-search/route.ts) -
// full-catalog substring match across title/subtitle/description with its own relevance
// ranking (exact title > title-starts-with > title-contains > subtitle > description-only)
// when `q` is given, published products only. `categoryId` composes with `q` (both can be set
// at once - "search within a category"); omitting both just browses the category (or the full
// catalogue) in DB order. It does NOT resolve calculated_price for a plain `q` search (only
// when min_price/max_price/price sort are also given - see that file's needsPriceCalc), so
// this only returns bare id/title/handle/thumbnail; callers hydrate full price/collection/
// category data via a follow-up fetchProductsByIds, same two-step pattern homeApi.ts already
// uses for product-sections. Used by both the Search screen (q only) and the Categories screen
// (categoryId/collectionId/sort/price/stock, optionally combined with q - see categoriesApi.ts
// for the filter-sheet wiring). collectionId is a comma-joined string for a multi-brand pick,
// matching the route's own `collection_id.includes(",") ? split(",") : collection_id` parsing.
// region_id is only sent when the endpoint actually needs it (price filter/sort, see
// needsPriceCalc in that route) - sending it unconditionally is harmless but pointless extra
// query cost otherwise.
export async function searchProducts(opts: {
  q?: string;
  categoryId?: string;
  collectionId?: string;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'title_asc' | 'title_desc';
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ ids: string[]; count: number }> {
  const { q, categoryId, collectionId, sort, minPrice, maxPrice, inStock, limit = 24, offset = 0 } = opts;
  const needsRegion = minPrice !== undefined || maxPrice !== undefined || sort === 'price_asc' || sort === 'price_desc';
  const data = await storeFetch<{ products: { id: string }[]; count: number }>('/store/products-search', {
    q,
    category_id: categoryId,
    collection_id: collectionId,
    sort,
    min_price: minPrice !== undefined ? String(minPrice) : undefined,
    max_price: maxPrice !== undefined ? String(maxPrice) : undefined,
    in_stock: inStock ? 'true' : undefined,
    region_id: needsRegion ? DEFAULT_REGION_ID : undefined,
    limit: String(limit),
    offset: offset ? String(offset) : undefined,
  });
  return { ids: data.products.map((p) => p.id), count: data.count };
}

// GET /store/products/:id/scheme (src/api/store/products/[id]/scheme/route.ts) - admin-curated
// per-product cross-sell lists (id-only refs here; product/[id].tsx hydrates full price/
// collection/category data for whichever lists it actually uses via a follow-up
// fetchProductsByIds, same two-step pattern as everywhere else) plus an active promotion
// ("Scheme Discount") if one's configured. Each list is simply empty when nothing's been
// configured for this product in admin - not an error, just nothing to show.
export interface ProductScheme {
  mode: 'buy_get' | 'percentage' | null;
  buyQuantity?: number | null;
  freeQuantity?: number | null;
  minQuantity?: number | null;
  percentOff?: number | null;
  alternateBrandProducts: { id: string }[];
  sameCategoryProducts: { id: string }[];
  peopleAlsoBoughtProducts: { id: string }[];
  ingredients: string[];
  concerns: string[];
  productForm: string | null;
}

export function fetchProductScheme(productId: string): Promise<ProductScheme> {
  return storeFetch(`/store/products/${productId}/scheme`, { region_id: DEFAULT_REGION_ID });
}

// GET /store/delivery-tat (src/api/store/delivery-tat/route.ts) - real Delhivery expected-TAT
// lookup for the product page's pincode check, already accounting for IST dispatch cutoffs
// (Sunday/after-4pm rules). `success: false` covers both a genuinely unserviceable pincode
// (Delhivery's own message, safe to show as-is) and a config/network failure - either way
// `message` is what the UI should display.
export interface DeliveryEstimate {
  success: boolean;
  message: string;
  deliveryDateFormatted?: string;
}

export function fetchDeliveryEstimate(pincode: string): Promise<DeliveryEstimate> {
  return storeFetch('/store/delivery-tat', { pincode });
}

// GET /store/tax-rates (src/api/store/tax-rates/route.ts) - real per-product-type GST rates
// (5 real rates on this store: 0/5/12/18/28%, resolved by product.type_id, `defaultRate` for
// anything unmapped). See taxRates.ts for how this is cached/applied to product prices.
export interface TaxRatesResponse {
  defaultRate: number;
  byProductType: Record<string, number>;
}

export function fetchTaxRates(): Promise<TaxRatesResponse> {
  return storeFetch('/store/tax-rates');
}

// Native GET /store/orders (docs/STORE_API.md section 7) - auto-scoped to the logged-in
// customer via the Authorization bearer token (see authToken.ts/medusaClient's getAuthHeader),
// no customer_id param needed. `fields` explicitly requests product id/thumbnail/title per line
// item - the custom reorder route only asked for variant_id/quantity, these aren't pulled by
// default. Used by the real "Buy again" Home section (ordersApi.ts) and, later, a real order
// history screen.
export interface MedusaOrderLineItem {
  id: string;
  product_id: string | null;
  product_title: string;
  thumbnail: string | null;
  quantity: number;
  unit_price: number;
}

export interface MedusaOrderAddress {
  first_name: string | null;
  last_name: string | null;
  address_1: string;
  city: string;
  province: string | null;
  postal_code: string;
  phone: string | null;
}

export interface MedusaOrderFulfillment {
  id: string;
  shipped_at: string | null;
  delivered_at: string | null;
  canceled_at: string | null;
}

export interface MedusaOrder {
  id: string;
  display_id: number;
  // Order-level workflow status (pending/completed/canceled/...). Deliberately does NOT also
  // fetch `fulfillment_status` - confirmed in this backend's own admin route source
  // (api/admin/operations/dispatch/route.ts's isDispatchable comment) that it's a computed
  // getter which only populates when hydrated through the Order module service directly; the
  // cross-module query.graph the Store API uses returns it as undefined. ordersApi.ts's
  // orderStatusFor() derives the real customer-facing status from `fulfillments` below instead
  // (shipped_at/delivered_at/canceled_at), the same reliable approach the admin side already
  // uses for the identical reason.
  status: string;
  created_at: string;
  total: number;
  currency_code: string;
  items: MedusaOrderLineItem[];
  shipping_address: MedusaOrderAddress | null;
  fulfillments: MedusaOrderFulfillment[];
}

// `items.quantity` (the shorthand path) silently vanishes from the response - confirmed live -
// whenever `items.unit_price` is ALSO requested in the same query (a real query.graph bug: each
// resolves fine alone, but together only unit_price survives). `items.detail.quantity` (the
// unambiguous nested relation path - quantity actually lives on OrderItem/"detail", a separate
// entity from the OrderLineItem product/price fields) co-exists with unit_price correctly -
// confirmed live. Requested that way below and flattened back onto MedusaOrderLineItem.quantity
// in fetchOrders/fetchOrder so every caller keeps the same flat shape.
const ORDER_FIELDS = [
  'id',
  'display_id',
  'status',
  'created_at',
  'total',
  'currency_code',
  'items.id',
  'items.product_id',
  'items.product_title',
  'items.thumbnail',
  'items.detail.quantity',
  'items.unit_price',
  'shipping_address.first_name',
  'shipping_address.last_name',
  'shipping_address.address_1',
  'shipping_address.city',
  'shipping_address.province',
  'shipping_address.postal_code',
  'shipping_address.phone',
  'fulfillments.id',
  'fulfillments.shipped_at',
  'fulfillments.delivered_at',
  'fulfillments.canceled_at',
].join(',');

type RawOrderLineItem = Omit<MedusaOrderLineItem, 'quantity'> & { detail: { quantity: number } };
type RawOrder = Omit<MedusaOrder, 'items'> & { items: RawOrderLineItem[] };

function flattenOrder(raw: RawOrder): MedusaOrder {
  return { ...raw, items: raw.items.map((item) => ({ ...item, quantity: item.detail.quantity })) };
}

export async function fetchOrders(opts: { limit?: number; offset?: number } = {}): Promise<{ orders: MedusaOrder[]; count: number }> {
  const { limit = 20, offset = 0 } = opts;
  const data = await storeFetch<{ orders: RawOrder[]; count: number }>('/store/orders', {
    limit: String(limit),
    offset: String(offset),
    fields: ORDER_FIELDS,
  });
  return { orders: data.orders.map(flattenOrder), count: data.count };
}

export async function fetchOrder(orderId: string): Promise<MedusaOrder> {
  const data = await storeFetch<{ order: RawOrder }>(`/store/orders/${orderId}`, { fields: ORDER_FIELDS });
  return flattenOrder(data.order);
}
