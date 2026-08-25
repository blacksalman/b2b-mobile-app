export interface Product {
  id: number;
  name: string;
  brand: string;
  cs: string; // case/pack description, e.g. "Box of 100 × 100g pouches"
  price: number; // trade unit price (per case)
  cmp?: number; // compare-at / MRP price (omit = no discount shown)
  tint: string; // CSS color/rgba used as placeholder "photo" background
  cat: string; // category name, matches a Category.name
  badge?: string; // e.g. 'Deal', '-25%', 'Highly rated'
  gated?: boolean; // none of the seed products set this — gating path exists but is unreachable, by design
  thumbnail?: string | null; // real product photo URL - only API-backed products (homeApi.ts) set this; mock catalog has none
  images?: string[]; // real product gallery URLs (product/[id].tsx's lightbox/thumbnails) - API-backed only
  medusaId?: string; // the real Medusa product id this was built from - API-backed only
  handle?: string; // real product slug (e.g. "nurall-capsule-60caps-ayurveda-one-8104") - API-backed
  // only. product/[id].tsx routes by this when present (see idHash.ts's productHref) instead of the
  // numeric id, and fetches product detail by handle directly - readable in the URL, and (unlike the
  // numeric hashId) resolvable on a cold page load/refresh without depending on productRegistry.
  quantityTiers?: { minQty: number; maxQty: number | null; amount: number }[]; // real per-variant
  // quantity-discount price rows (admin's "Quantity Discount" widget, e.g. "3 qty = 5% off") -
  // API-backed only. Independent of `cmp` (a separate MRP/sale-price concept) - a product can have
  // real tiers with no cmp discount at all, which product-detail-content.ts's bulkTiersFor/
  // bulkUnitPrice account for. length <= 1 means just the qty=1 baseline row, i.e. no real tiers.
  inStock?: boolean; // real availability of the variant this card/page uses (homeApi.ts's toProduct)
  // - API-backed only, undefined for the mock catalog (treated as in-stock everywhere this is
  // read, since mock products have no real inventory concept). Same rule the backend's own
  // /store/products-search in_stock filter uses: not inventory-tracked, or backorder allowed, or
  // some stock location has available_quantity > 0.
  realVariants?: { id: string; title: string; price: number; cmp?: number; inStock?: boolean }[];
  // Every real Medusa variant this product actually has (homeApi.ts's toProduct/toVariantProduct)
  // - API-backed only, set only when there's more than one (a single-variant product has nothing
  // to choose between). length > 1 is what drives "Select option" instead of a plain Add button
  // (DsProductCard) and the real variant picker on the product detail page - a genuinely
  // different concept from `quantityTiers` above (qty-based bulk pricing WITHIN one variant).
}

export interface Category {
  name: string;
  count: number;
  tint: string;
}

export type CartState = Record<number, number>; // { [productId]: qty }

export interface DecoratedProduct extends Product {
  caseLabel: string;
  gated: boolean;
  showPrice: boolean;
  priceLabel: string;
  compareLabel: string;
  unitPriceLabel: string;
  priceOrGate: string;
  packLine: string;
  eachLabel: string;
  packNoun: string;
  compareEach: string;
  cartQty: number;
  inCart: boolean;
  notInCart: boolean;
}
