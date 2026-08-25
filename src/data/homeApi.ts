import { useEffect, useState } from 'react';
import {
  fetchProductSections,
  fetchCategorySections,
  fetchBanners,
  fetchCollections,
  fetchCollectionProductCount,
  fetchProductsByIds,
  type MedusaProduct,
  type MedusaBanner,
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
// to home-content.ts which stays fully mock for Buy again / Fast-moving
// offers (explicitly deferred - pending a decision with the doctor) and the
// purely-editorial rails (Doctor's Talk, What buyers say, promo banners)
// that have no backend model at all yet.
//
// `buy-again` and `fast-moving-offer` product-sections DO already exist in
// the DB (an admin created them) but are deliberately excluded here - they
// stay on mock data until that separate decision is made.
const EXCLUDED_SLUGS = new Set(['buy-again', 'fast-moving-offer']);

export interface ApiConcernShelf {
  slug: string;
  title: string;
  blurb: string;
  tint: string;
  ids: number[];
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
  concernShelves: ApiConcernShelf[];
  categoryTiles: ApiCategoryTile[];
  brands: ApiBrand[];
  heroBanners: MedusaBanner[];
}

const EMPTY_DATA: HomeApiData = {
  loading: true,
  error: false,
  bestSellers: [],
  newArrivals: [],
  featured: [],
  concernShelves: [],
  categoryTiles: [],
  brands: [],
  heroBanners: [],
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
        const [sectionsRes, categorySectionsRes, bannersRes, collectionsRes] = await Promise.all([
          fetchProductSections(),
          fetchCategorySections(),
          fetchBanners('home'),
          fetchCollections(),
        ]);

        const sections = sectionsRes.product_sections.filter((s) => !EXCLUDED_SLUGS.has(s.slug));
        const bestSellersSection = sections.find((s) => s.slug === 'best-sellers');
        const newArrivalsSection = sections.find((s) => s.slug === 'new-arrivals');
        const featuredSection = sections.find((s) => s.slug === 'featured-product' || s.slug === 'featured');
        const concernSections = sections.filter(
          (s) => s !== bestSellersSection && s !== newArrivalsSection && s !== featuredSection
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
          concernShelves: concernSections.map((s, i) => ({
            slug: s.slug,
            title: s.title,
            blurb: 'Curated products for this shelf',
            tint: CONCERN_TINTS[i % CONCERN_TINTS.length],
            ids: resolve(s.products).map((p) => hashProductId(p.id)),
            rawProducts: resolve(s.products),
          })),
          categoryTiles,
          brands,
          heroBanners: bannersRes.banners,
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

// Adapts a real Medusa product into the app's Product shape, registering it (productRegistry +
// cartSync's variant map) as a side effect - every real product that flows through this becomes
// resolvable later by its hashed id, which is what lets product/[id].tsx open a real product
// detail page from a card tap (see useProductDetail in productDetailApi.ts) and what lets
// cartTotals.ts price a real product in the cart/mini-cart. Shared by toRailProduct below and
// productDetailApi.ts's main-product fetch - anywhere a real MedusaProduct needs to become a
// Product.
export function toProduct(mp: MedusaProduct): Product {
  const variant = cheapestVariant(mp);
  const price = variant?.calculated_price?.calculated_amount ?? 0;
  const original = variant?.calculated_price?.original_amount ?? price;
  const id = hashProductId(mp.id);

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
  };
  registerProduct(product);
  return product;
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
