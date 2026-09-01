import { useEffect, useState } from 'react';
import {
  fetchProductSections,
  fetchCategorySections,
  fetchBanners,
  fetchBrandSections,
  fetchCollectionProductCounts,
  fetchProductsByIds,
  fetchDoctorTalks,
  searchProducts,
  storeFetch,
  type MedusaProduct,
  type MedusaBanner,
  type MedusaVariant,
  type MedusaDoctorTalk,
} from '@/lib/medusaClient';
import { decorateProduct, discountBadge, marginOf } from './decorateProduct';
import { registerApiProductVariant } from './cartSync';
import { registerProduct } from './productRegistry';
import { hashProductId } from './idHash';
import { hasBulkTiers, bulkUnitPrice } from './product-detail-content';
import { getTaxRateForProductType } from './taxRates';
import { summaryFor, type ReviewSummaryMap } from './reviewsApi';
import type { CartState, Product } from './types';
import type { RailProduct } from './home-content';

export { hashProductId };

// Home screen sections backed by the backend's real admin-curated content
// (product-sections / category-sections / brand-sections / banners). Buy again and What buyers
// say are ALSO real now (ordersApi.ts's useBuyAgainProducts, reviewsApi.ts's useRecentReviews
// respectively) but neither is a product-section, so both stay out of this file entirely -
// index.tsx calls their own hooks directly. Only Doctor's Talk remains purely-editorial mock
// content (home-content.ts) with no backend model yet - the promo banners (below) are real too now.
//
// `buy-again` stays excluded here since it was never a real product-section to begin with (its
// content comes from order history, not this admin-curated mechanism).
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
  // Set by the admin's Category Image widget (metadata.image_url) - null until an admin uploads
  // one, in which case the tile shows this instead of the glyph/tint placeholder.
  imageUrl: string | null;
}

export interface ApiBrand {
  id: string;
  name: string;
  initials: string;
  line: string;
  skus: number;
  tint: string;
  // Set by the admin's Collection Image widget (metadata.image_url) - null until an admin
  // uploads one, in which case the card shows this instead of the "store photo" placeholder.
  imageUrl: string | null;
  // Set by the same widget's separate "Listing Banner Image" field (metadata.listing_banner_
  // image_url) - a distinct, optional image for the brand's Listing page hero (a square brand-
  // card photo rarely crops well into a wide banner). openBrandListing (index.tsx) falls back to
  // imageUrl, then the flat tint, when this is null - see listing.tsx's own fallback comment.
  listingBannerImageUrl: string | null;
}

// Each section of Home's real content resolves and renders independently - no single "loading"
// flag gating the whole screen. Previously this was one big loading boolean flipped only once
// every fetch (including a slow combined product-hydration call spanning every section) had
// finished, which left the screen fully blank for 8-10s and then popped everything in at once
// (see the "add a loader / display whatever is fetched" conversation). Now each section has its
// own `<x>Loading` flag so index.tsx can show a lightweight per-section skeleton only until that
// section's own data arrives, letting fast pieces (hero banner, category tiles, catalog counts)
// appear immediately instead of waiting on the slowest one.
export interface HomeApiData {
  error: boolean;
  bestSellers: MedusaProduct[];
  bestSellersLoading: boolean;
  newArrivals: MedusaProduct[];
  newArrivalsLoading: boolean;
  featured: MedusaProduct[];
  featuredLoading: boolean;
  fastMoving: MedusaProduct[];
  fastMovingLoading: boolean;
  concernShelves: ApiConcernShelf[];
  concernShelvesLoading: boolean;
  categoryTiles: ApiCategoryTile[];
  categoryTilesLoading: boolean;
  brands: ApiBrand[];
  brandsLoading: boolean;
  heroBanners: MedusaBanner[];
  heroBannersLoading: boolean;
  // "Promo cards" rail - GET /store/banners?target_type=home_promo. Same Banner model/shape as
  // heroBanners, just a distinct target_type so admin can upload a separate image set for this
  // row (see banner.ts's target_type enum + the admin Banners page's "Home Promo Cards" option).
  promoBanners: MedusaBanner[];
  promoBannersLoading: boolean;
  // Real full-catalog totals (not scoped to the Prescription-at-a-glance tiles above) - backs the
  // "Explore full catalogue" band's product/category counts, replacing that copy's old hardcoded
  // "300+ products across 8 categories".
  catalogProductCount: number;
  catalogCategoryCount: number;
  catalogCountsLoading: boolean;
}

const EMPTY_DATA: HomeApiData = {
  error: false,
  bestSellers: [],
  bestSellersLoading: true,
  newArrivals: [],
  newArrivalsLoading: true,
  featured: [],
  featuredLoading: true,
  fastMoving: [],
  fastMovingLoading: true,
  concernShelves: [],
  concernShelvesLoading: true,
  categoryTiles: [],
  categoryTilesLoading: true,
  brands: [],
  brandsLoading: true,
  heroBanners: [],
  heroBannersLoading: true,
  promoBanners: [],
  promoBannersLoading: true,
  catalogProductCount: 0,
  catalogCategoryCount: 0,
  catalogCountsLoading: true,
};

const CONCERN_TINTS = ['#DCF5E9', '#FCF1E0', '#EAEFF7', '#F7EBED'];
const CATEGORY_GLYPHS = ['∿', '❧', '◍', '⛨', '◐', '⚕'];
const CATEGORY_TINTS = ['#DCF5E9', '#FCF1E0', '#EAEFF7', '#F7EBED'];
const BRAND_TINTS = ['#FCF1E0', '#DCF5E9'];

function initialsOf(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  return (words[0]?.[0] ?? '') + (words[1]?.[0] ?? '');
}

// Sorts hydrated products back to `ids`' original order (fetchProductsByIds makes no ordering
// guarantee) and drops any id that didn't resolve (removed/unpublished since the section was
// configured) - shared by every section hydration below.
function orderHydrated(ids: { id: string }[], hydrated: MedusaProduct[]): MedusaProduct[] {
  const byId = new Map(hydrated.map((p) => [p.id, p] as const));
  return ids.map((p) => byId.get(p.id)).filter((p): p is MedusaProduct => !!p);
}

// Fetches every piece of Home's real content, each independently - NOT one Promise.all gating a
// single setData() at the end (see HomeApiData's own comment for why). Every fetch below patches
// state as soon as IT resolves, so section A never waits on section B's network round trip.
//
// Product sections specifically: fetchProductSections() itself is fast (just ids/slugs/titles,
// no price/stock data), so it resolves quickly and tells us which named sections exist. Each
// NAMED section (best sellers/new arrivals/featured/fast-moving) then hydrates with its OWN
// fetchProductsByIds call, independently of the others - previously this was one combined call
// hydrating every section's products (including every concern shelf) at once, which meant Best
// Sellers's own ~10 products sat blocked behind the slowest/largest shelf's hydration too. Concern
// shelves still hydrate as one combined batch (their count/membership isn't known until
// fetchProductSections resolves, and they're the lowest-priority, typically below-the-fold
// section anyway - not worth splitting into N separate requests).
export function useHomeApiData(): HomeApiData {
  const [data, setData] = useState<HomeApiData>(EMPTY_DATA);

  useEffect(() => {
    let cancelled = false;
    const patch = (partial: Partial<HomeApiData>) => {
      if (!cancelled) setData((prev) => ({ ...prev, ...partial }));
    };

    fetchBanners('home')
      .then((res) => patch({ heroBanners: res.banners, heroBannersLoading: false }))
      .catch(() => patch({ heroBannersLoading: false, error: true }));

    fetchBanners('home_promo')
      .then((res) => patch({ promoBanners: res.banners, promoBannersLoading: false }))
      .catch(() => patch({ promoBannersLoading: false, error: true }));

    // "prescriptions-at-a-glance" - the admin-curated section backing THIS specific tile grid.
    // Previously fetched with no slug filter at all, which returned EVERY category section
    // (including "category-page", a separate section meant only for the Categories screen's own
    // chip rail) and merged their categories together - Home ended up showing 8 tiles instead of
    // the 6 actually curated for it, 2 of which ("Women's Health Concern", "Hair Health") were
    // never meant to appear here.
    fetchCategorySections('prescriptions-at-a-glance')
      .then((res) => {
        const categoryTiles: ApiCategoryTile[] = [];
        const seenCategoryIds = new Set<string>();
        for (const section of res.category_sections) {
          for (const cat of section.categories) {
            if (seenCategoryIds.has(cat.id)) continue;
            seenCategoryIds.add(cat.id);
            categoryTiles.push({
              id: cat.id,
              name: cat.name,
              handle: cat.handle,
              glyph: CATEGORY_GLYPHS[categoryTiles.length % CATEGORY_GLYPHS.length],
              tint: CATEGORY_TINTS[categoryTiles.length % CATEGORY_TINTS.length],
              imageUrl: cat.metadata?.image_url ?? null,
            });
          }
        }
        patch({ categoryTiles, categoryTilesLoading: false });
      })
      .catch(() => patch({ categoryTilesLoading: false, error: true }));

    // "home-brands" - the admin-curated section (Operations > Brand Sections in admin, title
    // "Home Brands") backing this rail. Shows only the admin's picks instead of every collection
    // in the catalog - same reasoning as category-sections' "category-page".
    fetchBrandSections('home-brands')
      .then(async (res) => {
        const curatedBrands = res.brand_sections[0]?.brands ?? [];
        const brandCounts = await fetchCollectionProductCounts(curatedBrands.map((c) => c.id));
        const brands: ApiBrand[] = curatedBrands.map((c, i) => ({
          id: c.id,
          name: c.title,
          initials: initialsOf(c.title),
          line: 'Direct trade partner',
          skus: brandCounts[c.id] ?? 0,
          tint: BRAND_TINTS[i % BRAND_TINTS.length],
          imageUrl: c.metadata?.image_url ?? null,
          listingBannerImageUrl: c.metadata?.listing_banner_image_url ?? null,
        }));
        patch({ brands, brandsLoading: false });
      })
      .catch(() => patch({ brandsLoading: false, error: true }));

    // limit:1 - only `count` is read from either. No parent_category_id filter - this should
    // match the FULL category count (matches admin's Product > Categories menu, e.g. 84), not
    // just the 13 top-level ones.
    Promise.all([
      searchProducts({ limit: 1 }),
      storeFetch<{ count: number }>('/store/product-categories', { limit: '1' }),
    ])
      .then(([catalogProducts, catalogCategories]) => {
        patch({
          catalogProductCount: catalogProducts.count,
          catalogCategoryCount: catalogCategories.count,
          catalogCountsLoading: false,
        });
      })
      .catch(() => patch({ catalogCountsLoading: false, error: true }));

    fetchProductSections()
      .then((sectionsRes) => {
        const sections = sectionsRes.product_sections.filter((s) => !EXCLUDED_SLUGS.has(s.slug));
        const bestSellersSection = sections.find((s) => s.slug === 'best-sellers');
        const newArrivalsSection = sections.find((s) => s.slug === 'new-arrivals');
        const featuredSection = sections.find((s) => s.slug === 'featured-product' || s.slug === 'featured');
        const fastMovingSection = sections.find((s) => s.slug === 'fast-moving-offer');
        const concernSections = sections.filter(
          (s) => s !== bestSellersSection && s !== newArrivalsSection && s !== featuredSection && s !== fastMovingSection
        );

        if (bestSellersSection?.products.length) {
          fetchProductsByIds(bestSellersSection.products.map((p) => p.id))
            .then((hydrated) => patch({ bestSellers: orderHydrated(bestSellersSection.products, hydrated), bestSellersLoading: false }))
            .catch(() => patch({ bestSellersLoading: false, error: true }));
        } else {
          patch({ bestSellers: [], bestSellersLoading: false });
        }

        if (newArrivalsSection?.products.length) {
          fetchProductsByIds(newArrivalsSection.products.map((p) => p.id))
            .then((hydrated) => patch({ newArrivals: orderHydrated(newArrivalsSection.products, hydrated), newArrivalsLoading: false }))
            .catch(() => patch({ newArrivalsLoading: false, error: true }));
        } else {
          patch({ newArrivals: [], newArrivalsLoading: false });
        }

        if (featuredSection?.products.length) {
          fetchProductsByIds(featuredSection.products.map((p) => p.id))
            .then((hydrated) => patch({ featured: orderHydrated(featuredSection.products, hydrated), featuredLoading: false }))
            .catch(() => patch({ featuredLoading: false, error: true }));
        } else {
          patch({ featured: [], featuredLoading: false });
        }

        if (fastMovingSection?.products.length) {
          fetchProductsByIds(fastMovingSection.products.map((p) => p.id))
            .then((hydrated) => patch({ fastMoving: orderHydrated(fastMovingSection.products, hydrated), fastMovingLoading: false }))
            .catch(() => patch({ fastMovingLoading: false, error: true }));
        } else {
          patch({ fastMoving: [], fastMovingLoading: false });
        }

        if (concernSections.length) {
          const concernIds = [...new Set(concernSections.flatMap((s) => s.products.map((p) => p.id)))];
          fetchProductsByIds(concernIds)
            .then((hydrated) => {
              const concernShelves: ApiConcernShelf[] = concernSections.map((s, i) => ({
                slug: s.slug,
                title: s.title,
                blurb: 'Curated products for this shelf',
                tint: CONCERN_TINTS[i % CONCERN_TINTS.length],
                rawProducts: orderHydrated(s.products, hydrated),
              }));
              patch({ concernShelves, concernShelvesLoading: false });
            })
            .catch(() => patch({ concernShelvesLoading: false, error: true }));
        } else {
          patch({ concernShelves: [], concernShelvesLoading: false });
        }
      })
      .catch(() =>
        patch({
          bestSellersLoading: false,
          newArrivalsLoading: false,
          featuredLoading: false,
          fastMovingLoading: false,
          concernShelvesLoading: false,
          error: true,
        })
      );

    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}

function cheapestVariant(mp: MedusaProduct) {
  const priced = (mp.variants ?? []).filter((v) => v.calculated_price);
  if (!priced.length) return undefined;
  // Prefer the cheapest IN-STOCK variant so the card never shows "Out of stock" (and that
  // variant's price) for a product that actually has a purchasable option - e.g. a 2-variant
  // product where the cheaper pack is sold out but the pricier one isn't should still read as
  // buyable. Only falls back to the cheapest overall if every variant is genuinely out of stock,
  // same as before.
  const inStockPriced = priced.filter((v) => isVariantInStock(v));
  const pool = inStockPriced.length ? inStockPriced : priced;
  return pool.reduce((min, v) =>
    v.calculated_price!.calculated_amount < min.calculated_price!.calculated_amount ? v : min
  );
}

// Mirrors the backend's own isVariantInStock (src/api/store/products-search/route.ts) exactly,
// so a product's stock state agrees with what the real in_stock search filter would say: not
// inventory-tracked, or backorder allowed, or some stock location has available_quantity > 0.
export function isVariantInStock(variant?: MedusaVariant): boolean {
  if (!variant) return true;
  if (!variant.manage_inventory) return true;
  if (variant.allow_backorder) return true;
  return (variant.inventory_items ?? []).some((item) =>
    (item.inventory?.location_levels ?? []).some((level) => (level.available_quantity ?? 0) > 0)
  );
}

// Product-level in-stock check - true if ANY variant is purchasable (same "has a purchasable
// option" reasoning as cheapestVariant preferring an in-stock variant over the cheapest one).
export function isProductInStock(product: MedusaProduct): boolean {
  return (product.variants ?? []).some((v) => isVariantInStock(v));
}

// Every real variant this product has, for the "Select option" picker (DsProductCard) and the
// product detail page's real variant grid - only meaningful (and only ever read) when there's
// more than one, see Product.realVariants's own comment in types.ts.
function buildRealVariantOptions(mp: MedusaProduct): NonNullable<Product['realVariants']> {
  // Same GST rate for every variant of this product (tax is a product_type-level attribute, not
  // per-variant) - baked directly into price/cmp here since the variant picker (product/[id].tsx)
  // reads these straight into money() without going through decorateProduct's own tax-aware
  // formatting.
  const taxMult = 1 + getTaxRateForProductType(mp.type_id) / 100;
  return (mp.variants ?? []).map((v) => {
    const price = v.calculated_price?.calculated_amount ?? 0;
    const original = v.calculated_price?.original_amount ?? price;
    // Real option value(s) (e.g. "1 - 5 Yrs") - not v.title, which re-concatenates the whole
    // product name for this store's variants (e.g. "Swarnaprashana - Ayurveda One - 1 - 5 Yrs"),
    // unreadable as a short picker label. Falls back to v.title on the rare variant with no
    // options data at all, rather than showing a blank card.
    const label = v.options?.length ? v.options.map((o) => o.value).join(' / ') : v.title;
    return {
      id: v.id,
      title: label,
      price: price * taxMult,
      cmp: original > price ? original * taxMult : undefined,
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
    taxRate: getTaxRateForProductType(mp.type_id),
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

// margin has no backend source yet (no cost data exposed to the storefront) - kept as the same
// deterministic placeholder formula the mock rails already use (marginOf), just keyed off the
// real product's hashed id. rating/reviewCount ARE real now (apps/backend's review module,
// reviewsApi.ts) - `reviewSummaries` is a batch lookup the caller fetches once per screen (see
// reviewsApi.ts's useReviewSummaries) and passes in here, so this stays a plain sync function
// callable inside a .map() instead of needing to fetch per card. Omitted/product not yet in the
// map (still loading, or a mock-catalog product with no real id) falls back to a real "no
// reviews yet" zero state, never a fabricated number.
export function toRailProduct(mp: MedusaProduct, cart: CartState, loggedIn: boolean, reviewSummaries: ReviewSummaryMap = {}): RailProduct {
  const baseProduct = toProduct(mp);
  const qty = cart[baseProduct.id] || 0;
  const product = applyQuantityTierPricing(baseProduct, qty);
  // Re-register with the tier-adjusted price so cartTotals.ts (mini-cart/cart totals) reflects
  // the real discount too, not just this card's own display.
  if (product !== baseProduct) registerProduct(product);

  const summary = summaryFor(reviewSummaries, mp.id);

  return {
    ...decorateProduct(product, qty, loggedIn),
    rating: summary.average.toFixed(1),
    margin: marginOf(product.id),
    brandUpper: product.brand.toUpperCase(),
    discount: discountBadge(product),
    reviewCount: summary.count,
  };
}

export interface DoctorTalksState {
  loading: boolean;
  doctorTalks: MedusaDoctorTalk[];
}

// Real testimonials (Operations > Doctor's Talk in admin, GET /store/doctor-talks) - backs
// Home's "Doctor's Talk" rail, replacing what used to be a hardcoded doctorTalks array in
// home-content.ts. Independent of useHomeApiData - same "each section fetches on its own" reason
// as useBuyAgainProducts/useRecentReviews, not gated on or gating any other section.
export function useDoctorTalks(): DoctorTalksState {
  const [state, setState] = useState<DoctorTalksState>({ loading: true, doctorTalks: [] });

  useEffect(() => {
    let cancelled = false;
    fetchDoctorTalks()
      .then((data) => {
        if (!cancelled) setState({ loading: false, doctorTalks: data.doctor_talks });
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, doctorTalks: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
