// Thin fetch wrapper around the Medusa backend's Store API (apps/backend in
// B2b_Backend_On_Medusa). Only the endpoints the app has actually started wiring up live
// here - add more as more screens get connected (see AGENTS.md / CLAUDE.md conversation:
// wiring happens page by page, section by section, not all at once).

import { getAuthHeader } from './authToken';

const BASE_URL = process.env.EXPO_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? '';
export const DEFAULT_REGION_ID = process.env.EXPO_PUBLIC_MEDUSA_REGION_ID ?? '';

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

export function fetchCategorySections(): Promise<{ category_sections: MedusaCategorySection[] }> {
  return storeFetch('/store/category-sections');
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

export interface MedusaCollection {
  id: string;
  title: string;
  handle: string;
}

export function fetchCollections(): Promise<{ collections: MedusaCollection[] }> {
  return storeFetch('/store/collections', { limit: '100' });
}

// products-search's `count` (with limit=1, no results actually pulled beyond the one row)
// is the cheapest way to get a collection's real product total - see
// src/api/store/products-search/route.ts in the backend, no dedicated count endpoint exists.
export async function fetchCollectionProductCount(collectionId: string): Promise<number> {
  const data = await storeFetch<{ count: number }>('/store/products-search', {
    collection_id: collectionId,
    limit: '1',
  });
  return data.count;
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
}): Promise<{ ids: string[]; count: number }> {
  const { q, categoryId, collectionId, sort, minPrice, maxPrice, inStock, limit = 24 } = opts;
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
}

export interface MedusaOrder {
  id: string;
  display_id: number;
  status: string;
  created_at: string;
  total: number;
  currency_code: string;
  items: MedusaOrderLineItem[];
}

const ORDER_FIELDS = ['id', 'display_id', 'status', 'created_at', 'total', 'currency_code', 'items.id', 'items.product_id', 'items.product_title', 'items.thumbnail', 'items.quantity'].join(',');

export async function fetchOrders(opts: { limit?: number; offset?: number } = {}): Promise<{ orders: MedusaOrder[]; count: number }> {
  const { limit = 20, offset = 0 } = opts;
  return storeFetch('/store/orders', { limit: String(limit), offset: String(offset), fields: ORDER_FIELDS });
}

export async function fetchOrder(orderId: string): Promise<MedusaOrder> {
  const data = await storeFetch<{ order: MedusaOrder }>(`/store/orders/${orderId}`, { fields: ORDER_FIELDS });
  return data.order;
}
