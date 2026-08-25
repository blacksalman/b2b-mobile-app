import { products } from './products';
import type { FilterSelections } from '@/state/AppStateContext';

// The Categories screen itself (category rail, product grid, per-category banner) is real-data
// now - GET /store/product-categories + GET /store/products-search (see
// src/data/categoriesApi.ts and src/app/(tabs)/categories.tsx). What's left here is only what
// FilterSheet.tsx still needs: the filter tab/option lists and countNonSortFilters. The filter
// sheet itself isn't wired to the real product grid in this pass (see categories.tsx's
// file-level comment for why) - these lists just drive what the sheet displays and which pills
// show as "selected".

// Ported verbatim from the source's filterTabs names (line 1547) and each option list. Ingredient and
// product-form lists match the new design source exactly (not the old design's lists): ingredients
// swaps 'Neem' for 'Kumkumadi', product form drops 'Bhasma' entirely.
export const filterTabNames = ['Brand', 'Sort By', 'Price', 'Availability', 'Ingredients', 'Concern', 'Product form'] as const;
export type FilterTabName = (typeof filterTabNames)[number];

// Ported verbatim from the new source's `brandOptions:Array.from(new Set(P.map(x=>x.brand)))` (line
// 2878) — computed from the real product catalog, replacing the old design's static, non-matching
// ['AYUR VIBES', 'AYURVEDA ONE PVT LTD.'] list (which named brands no seed product actually has).
export const brandOptions = Array.from(new Set(products.map((p) => p.brand)));
export const sortOptions = ['Popular', 'Price: Low to High', 'Price: High to Low', 'Newest'];
export const priceOptions = ['Under ₹200', '₹200–₹500', '₹500–₹1000', 'Above ₹1000'];
export const availOptions = ['In stock only', 'Include out of stock'];
export const ingredientOptions = ['Ashwagandha', 'Triphala', 'Guggulu', 'Amla', 'Bhringraj', 'Kumkumadi'];
export const concernOptions = ['Immunity', 'Digestion', 'Joint & muscle', 'Skin & hair', "Women's health", 'Diabetes care'];
export const formOptions = ['Churna', 'Tablet', 'Capsule', 'Taila / Oil', 'Syrup / Asava'];

// Ported verbatim from the source's filtered-count helper (line 2960/2966/2972) used by
// catEmptyTitle/Body/Cta — deliberately excludes `sort`, unlike `hasActiveFilters` elsewhere.
export function countNonSortFilters(filters: FilterSelections): number {
  return filters.brand.length + filters.avail.length + filters.ing.length + filters.concern.length + filters.form.length + (filters.price ? 1 : 0);
}
