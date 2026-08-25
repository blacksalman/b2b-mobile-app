import { useEffect, useState } from 'react';
import {
  fetchProductSections,
  fetchCategorySections,
  fetchBanners,
  fetchCollections,
  fetchCollectionProductCount,
  fetchProductsByIds,
  searchProducts,
  storeFetch,
  type MedusaProduct,
  type MedusaBanner,
  type MedusaVariant,
} from '@/lib/medusaClient';
import { decorateProduct, discountBadge, marginOf, ratingOf, reviewCountOf } from './decorateProduct';
import { registerApiProductVariant } from './cartSync';
import { registerProduct } from './productRegistry';
import { hashProductId } from './idHash';
import { hasBulkTiers, bulkUnitPrice } from './product-detail-content';
import type { CartState, Product } from './types';
import type { RailProduct } from './home-content';

export { hashProductId };

// Home screen sections backed by the backend's real admin-curated content
// (product-sections / category-sections / banners / collections), as opposed
// to home-content.ts which stays fully mock for Buy again (still deferred -
// pending a decision with the doctor) and the purely-editorial rails
// (Doctor's Talk, What buyers say, promo banners) that have no backend
// model at all yet. Fast-moving offers used to be deferred alongside Buy
// again too, but now has a real product-section (slug "fast-moving-offer")
// and renders as its own real rail (see fastMoving below) - same shape as
// bestSellers/newArrivals/featured, no more special-casing its own useCase-
// labeled row layout (that was mock-only content with no real equivalent).
//
// `buy-again` still stays excluded here - it stays on mock data until that
// separate decision is made.
const EXCLUDED_SLUGS = new Set(['buy-again']);

export interface ApiConcernShelf {
  slug: string;
  title: string;
  blurb: string;
  tint: string;
  rawProducts: MedusaProduct[];
}

export interface ApiCategoryTile {
  id: string;
  name: string;
  handle: string;
  glyph: string;
  tint: string;
}

export interface ApiBrand {
  id: string;
  name: string;
  initials: string;
  line: string;
  skus: number;
  tint: string;
}

export interface HomeApiData {
  loading: boolean;
  error: boolean;
  bestSellers: MedusaProduct[];
  newArrivals: MedusaProduct[];
  featured: MedusaProduct[];
  fastMoving: MedusaProduct[];
  concernShelves: ApiConcernShelf[];
  categoryTiles: ApiCategoryTile[];
  brands: ApiBrand[];
  heroBanners: MedusaBanner[];
  // Real full-catalog totals (not scoped to the Prescription-at-a-glance tiles above) - backs the
  // "Explore full catalogue" band's product/category counts, replacing that copy's old hardcoded
  // "300+ products across 8 categories".
  catalogProductCount: number;
  catalogCategoryCount: number;
}

const EMPTY_DATA: HomeApiData = {
  loading: true,
  error: false,
  bestSellers: [],
  newArrivals: [],
  featured: [],
  fastMoving: [],
  concernShelves: [],
  categoryTiles: [],
  brands: [],
  heroBanners: [],
  catalogProductCount: 0,
  catalogCategoryCount: 0,
};

const CONCERN_TINTS = ['#DCF5E9', '#FCF1E0', '#EAEFF7', '#F7EBED'];
const CATEGORY_GLYPHS = ['∿', '❧', '◍', '⛨', '◐', '⚕'];
const CATEGORY_TINTS = ['#DCF5E9', '#FCF1E0', '#EAEFF7', '#F7EBED'];
const BRAND_TINTS = ['#FCF1E0', '#DCF5E9'];

function initialsOf(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  return (words[0]?.[0] ?? '') + (words[1]?.[0] ?? '');
}

// Fetches every piece of Home's real content in parallel, once. Product
// price/collection/category data is hydrated for every product referenced
// by any (non-excluded) product-section in a single batched
// fetchProductsByIds call rather than one request per section.
export function useHomeApiData(): HomeApiData {
  const [data, setData] = useState<HomeApiData>(EMPTY_DATA);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [sectionsRes, categorySectionsRes, bannersRes, collectionsRes, catalogProducts, catalogCategories] = await Promise.all([
          fetchProductSections(),
          fetchCategorySections(),
          fetchBanners('home'),
          fetchCollections(),
          // limit:1 - only `count` is read from either, same cheap-count trick
          // fetchCollectionProductCount already uses for a brand's product total.
          searchProducts({ limit: 1 }),
          storeFetch<{ count: number }>('/store/product-categories', { limit: '1', parent_category_id: 'null' }),
        ]);

        const sections = sectionsRes.product_sections.filter((s) => !EXCLUDED_SLUGS.has(s.slug));
        const bestSellersSection = sections.find((s) => s.slug === 'best-sellers');
        const newArrivalsSection = sections.find((s) => s.slug === 'new-arrivals');
        const featuredSection = sections.find((s) => s.slug === 'featured-product' || s.slug === 'featured');
        const fastMovingSection = sections.find((s) => s.slug === 'fast-moving-offer');
        const concernSections = sections.filter(
          (s) => s !== bestSellersSection && s !== newArrivalsSection && s !== featuredSection && s !== fastMovingSection
        );

        const allIds = [
          ...new Set(sections.flatMap((s) => s.products.map((p) => p.id))),
        ];
        const productsById = new Map(
          (await fetchProductsByIds(allIds)).map((p) => [p.id, p] as const)
        );
        const resolve = (ids: { id: string }[]): MedusaProduct[] =>
          ids.map((p) => productsById.get(p.id)).filter((p): p is MedusaProduct => !!p);

        const categoryTiles: ApiCategoryTile[] = [];
        const seenCategoryIds = new Set<string>();
        for (const section of categorySectionsRes.category_sections) {
          for (const cat of section.categories) {
            if (seenCategoryIds.has(cat.id)) continue;
            seenCategoryIds.add(cat.id);
            categoryTiles.push({
              id: cat.id,
              name: cat.name,
              handle: cat.handle,
              glyph: CATEGORY_GLYPHS[categoryTiles.length % CATEGORY_GLYPHS.length],
              tint: CATEGORY_TINTS[categoryTiles.length % CATEGORY_TINTS.length],
            });
          }
        }

        const brands: ApiBrand[] = await Promise.all(
          collectionsRes.collections.map(async (c, i) => ({
            id: c.id,
            name: c.title,
            initials: initialsOf(c.title),
            line: 'Direct trade partner',
            skus: await fetchCollectionProductCount(c.id),
            tint: BRAND_TINTS[i % BRAND_TINTS.length],
          }))
        );

        if (cancelled) return;

        setData({
          loading: false,
          error: false,
          bestSellers: bestSellersSection ? resolve(bestSellersSection.products) : [],
          newArrivals: newArrivalsSection ? resolve(newArrivalsSection.products) : [],
          featured: featuredSection ? resolve(featuredSection.products) : [],
          fastMoving: fastMovingSection ? resolve(fastMovingSection.products) : [],
          concernShelves: concernSections.map((s, i) => ({
            slug: s.slug,
            title: s.title,
            blurb: 'Curated products for this shelf',
            tint: CONCERN_TINTS[i % CONCERN_TINTS.length],
            rawProducts: resolve(s.products),
          })),
          categoryTiles,
          brands,
          heroBanners: bannersRes.banners,
          catalogProductCount: catalogProducts.count,
          catalogCategoryCount: catalogCategories.count,
        });
      } catch {
        if (!cancelled) setData((prev) => ({ ...prev, loading: false, error: true }));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}

function cheapestVariant(mp: MedusaProduct) {
  const priced = (mp.variants ?? []).filter((v) => v.calculated_price);
  if (!priced.length) return undefined;
  return priced.reduce((min, v) =>
    v.calculated_price!.calculated_amount < min.calculated_price!.calculated_amount ? v : min
  );
}

// Mirrors the backend's own isVariantInStock (src/api/store/products-search/route.ts) exactly,
// so a product's stock state agrees with what the real in_stock search filter would say: not
// inventory-tracked, or backorder allowed, or some stock location has available_quantity > 0.
function isVariantInStock(variant?: MedusaVariant): boolean {
  if (!variant) return true;
  if (!variant.manage_inventory) return true;
  if (variant.allow_backorder) return true;
  return (variant.inventory_items ?? []).some((item) =>
    (item.inventory?.location_levels ?? []).some((level) => (level.available_quantity ?? 0) > 0)
  );
}

// Every real variant this product has, for the "Select option" picker (DsProductCard) and the
// product detail page's real variant grid - only meaningful (and only ever read) when there's
// more than one, see Product.realVariants's own comment in types.ts.
function buildRealVariantOptions(mp: MedusaProduct): NonNullable<Product['realVariants']> {
  return (mp.variants ?? []).map((v) => {
    const price = v.calculated_price?.calculated_amount ?? 0;
    const original = v.calculated_price?.original_amount ?? price;
    return {
      id: v.id,
      title: v.title,
      price,
      cmp: original > price ? original : undefined,
      inStock: isVariantInStock(v),
    };
  });
}

// Shared by toProduct/toVariantProduct below - builds the Product shape for one specific variant
// of a real Medusa product, registering it (productRegistry + cartSync's variant map) as a side
// effect. `idHashSource` is the Medusa product id for the "representative" (cheapest) variant a
// card shows by default, or the variant's own id when a specific variant has been picked (real
// multi-variant products - see product/[id].tsx's activeVariantProduct) - each becomes its own
// addressable cart line/hashed id, exactly like a single-variant product already is.
function buildProductForVariant(mp: MedusaProduct, variant: MedusaVariant | undefined, idHashSource: string): Product {
  const price = variant?.calculated_price?.calculated_amount ?? 0;
  const original = variant?.calculated_price?.original_amount ?? price;
  const id = hashProductId(idHashSource);

  if (variant) registerApiProductVariant(id, variant.id);

  // Real quantity-discount tiers (admin's "Quantity Discount" widget) - the variant's own price
  // rows, same currency-code/no-price-list filter the admin widget itself uses, sorted so
  // product-detail-content.ts's bulkUnitPrice can just walk them in order.
  const quantityTiers = (variant?.prices ?? [])
    .filter((p) => p.currency_code === 'inr' && !p.price_list_id)
    .sort((a, b) => (a.min_quantity ?? 0) - (b.min_quantity ?? 0))
    .map((p) => ({ minQty: p.min_quantity ?? 1, maxQty: p.max_quantity, amount: p.amount }));

  const product: Product = {
    id,
    name: mp.title,
    brand: mp.collection?.title ?? '',
    cs: variant?.title ?? mp.title,
    price,
    cmp: original > price ? original : undefined,
    tint: '#F5F5F5',
    cat: mp.categories?.[0]?.name ?? '',
    gated: false,
    thumbnail: mp.thumbnail,
    images: mp.images?.length ? mp.images.map((i) => i.url) : mp.thumbnail ? [mp.thumbnail] : [],
    medusaId: mp.id,
    handle: mp.handle,
    quantityTiers,
    inStock: isVariantInStock(variant),
  };
  registerProduct(product);
  return product;
}

// Adapts a real Medusa product into the app's Product shape - the "representative" card/detail
// view, defaulting to the cheapest variant (unchanged behavior) with every real variant also
// attached (realVariants) so callers can offer a picker when there's more than one. Shared by
// toRailProduct below and productDetailApi.ts's main-product fetch - anywhere a real
// MedusaProduct needs to become a Product.
export function toProduct(mp: MedusaProduct): Product {
  const variant = cheapestVariant(mp);
  const product = buildProductForVariant(mp, variant, mp.id);
  if ((mp.variants?.length ?? 0) > 1) {
    product.realVariants = buildRealVariantOptions(mp);
    registerProduct(product);
  }
  return product;
}

// Builds the Product for one SPECIFIC real variant of mp (e.g. the age-range pack a customer
// picked on the product detail page) - same shape/registration as toProduct, but hashed off the
// variant's own id instead of the product's, so each variant becomes its own independent cart
// line with its own real price, exactly as if it were a separate single-variant product.
export function toVariantProduct(mp: MedusaProduct, variantId: string): Product {
  const variant = mp.variants?.find((v) => v.id === variantId);
  return buildProductForVariant(mp, variant, variantId);
}

// Real quantity-tier discounts (product.quantityTiers) only apply once the cart quantity
// actually reaches a discounted tier - at qty 0 or within the baseline range, the card should
// show the flat regular price with no sale/MRP badge, same as a product with no tiers at all.
// Once qty crosses into a real tier, this swaps `price` to that tier's amount and sets `cmp` to
// the qty=1 baseline (unless a genuine MRP already exists, which takes priority) so the card's
// existing hasDiscount/margin-chip/compare-price logic - which only ever looks at price/cmp -
// picks it up with no changes needed there.
function applyQuantityTierPricing(product: Product, qty: number): Product {
  if (!hasBulkTiers(product) || qty <= 0) return product;
  const baseline = product.quantityTiers![0].amount;
  const tierPrice = bulkUnitPrice(product, qty);
  if (tierPrice >= baseline) return product;
  return { ...product, price: tierPrice, cmp: product.cmp ?? baseline };
}

// rating/margin/reviewCount have no backend source yet (no store-facing
// review aggregate, no cost data exposed to the storefront) - kept as the
// same deterministic placeholder formulas the mock rails already use
// (marginOf/ratingOf/reviewCountOf), just keyed off the real product's
// hashed id instead of a mock id, so they're at least stable per product.
export function toRailProduct(mp: MedusaProduct, cart: CartState, loggedIn: boolean): RailProduct {
  const baseProduct = toProduct(mp);
  const qty = cart[baseProduct.id] || 0;
  const product = applyQuantityTierPricing(baseProduct, qty);
  // Re-register with the tier-adjusted price so cartTotals.ts (mini-cart/cart totals) reflects
  // the real discount too, not just this card's own display.
  if (product !== baseProduct) registerProduct(product);

  return {
    ...decorateProduct(product, qty, loggedIn),
    rating: ratingOf(product.id),
    margin: marginOf(product.id),
    brandUpper: product.brand.toUpperCase(),
    discount: discountBadge(product),
    reviewCount: reviewCountOf(product.id),
  };
}
