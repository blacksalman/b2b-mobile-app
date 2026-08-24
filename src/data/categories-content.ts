import { products } from './products';
import { categories } from './categories';
import { decorateProduct, marginOf, reviewCountOf } from './decorateProduct';
import type { CartState, Product } from './types';
import type { RailProduct } from './home-content';
import type { FilterSelections } from '@/state/AppStateContext';

// Ported verbatim from the new design source's per-category banner table (Various Mobile App -
// Phone.dc.html line 2858-2868) — replaces the old single static `catBanner` constant (which always
// showed the Skin & Hair Care copy regardless of the selected category). Categories with no table
// entry (Children's Ayurveda, Panchakarma Kits) fall through to the same default the source uses.
export interface CatBanner {
  title: string;
  sub: string;
  tint: string;
}

const CATEGORY_BANNERS: Record<string, CatBanner> = {
  'Classical Medicines': { title: 'Classical formulations, made to text', sub: 'Churna, vati and bhasma in trade cartons', tint: '#EDF1EA' },
  'Rasayana & Immunity': { title: 'Rasayana for daily resilience', sub: 'High-repeat immunity lines, bulk friendly', tint: '#DCF5E9' },
  "Women's Health": { title: 'Formulations for women’s wellbeing', sub: 'Asava, arishta and classical support', tint: '#F0ECF7' },
  'Diabetes Care': { title: 'Metabolic care your counter reorders', sub: 'Churna and vati for common prescriptions', tint: '#FCF1E0' },
  'Joint & Muscle Care': { title: 'Taila and guggulu for chronic joint care', sub: 'Long shelf life, consistent batches', tint: '#F7EBED' },
  'Skin & Hair Care': { title: 'Pure tailas, medicated the traditional way', sub: 'Explore the cold-pressed oil range', tint: '#EAEFF7' },
  'Health supplement': { title: 'Everyday supplements for the shelf', sub: 'Verified sourcing, trade pricing', tint: '#DCF5E9' },
  'Personal Care': { title: 'Herbal personal care, daily use', sub: 'Fast-moving lines for retail counters', tint: '#EDF1EA' },
};

const DEFAULT_CATEGORY_BANNER: CatBanner = { title: 'The full Ayurvedic catalogue', sub: 'Browse every line at your contract price', tint: '#DCF5E9' };

export function getCatBanner(category: string): CatBanner {
  return CATEGORY_BANNERS[category] || DEFAULT_CATEGORY_BANNER;
}

export interface CategoryRailChip {
  name: string;
  chipBg: string;
  chipBorder: string;
  color: string;
  select: () => void;
}

// Ported verbatim from `categoryRail` (source line 2851): a synthetic "All" chip prepended to the
// real category list, active when no category is selected.
export function buildCategoryRail(activeCategory: string, onSelect: (name: string) => void): CategoryRailChip[] {
  return [{ name: 'All' }, ...categories].map((c) => {
    const isAll = c.name === 'All';
    const on = isAll ? !activeCategory : activeCategory === c.name;
    return {
      name: c.name,
      chipBg: on ? '#DCF5E9' : '#F6F8F7',
      chipBorder: on ? '#25A567' : 'transparent',
      color: on ? '#0C4733' : '#586360',
      select: () => onSelect(isAll ? '' : c.name),
    };
  });
}

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

// Ported verbatim from `matchesCatFilters` (source line 2558-2581). Unlike the old design (where the
// filter sheet's picks were fully inert — the grid was driven only by search text), the new design
// really filters the grid by category + every filter-sheet pick. One faithfully-preserved quirk: a
// live search query overrides EVERYTHING else — while `catQuery` is set, category and every filter
// pick are ignored entirely, matching only product name+brand. This is the source's own behavior, not
// a shortcut taken here.
const CONCERN_TO_CATEGORY: Record<string, string> = {
  Immunity: 'Rasayana & Immunity',
  Digestion: 'Classical Medicines',
  'Joint & muscle': 'Joint & Muscle Care',
  'Skin & hair': 'Skin & Hair Care',
  "Women's health": "Women's Health",
  'Diabetes care': 'Diabetes Care',
};

const FORM_KEYWORD: Record<string, string> = {
  Churna: 'churna',
  Tablet: 'vati',
  Capsule: 'capsule',
  'Taila / Oil': 'taila',
  'Syrup / Asava': 'asava',
};

function matchesCatFilters(x: Product, category: string, query: string, filters: FilterSelections): boolean {
  const q = query.trim().toLowerCase();
  if (q) return (x.name + x.brand).toLowerCase().includes(q);
  if (category && x.cat !== category) return false;

  const has = (a: string[]) => a && a.length > 0;
  if (has(filters.brand) && !filters.brand.some((b) => x.brand.toUpperCase() === b.toUpperCase())) return false;
  if (has(filters.avail) && filters.avail.includes('In stock only') && x.gated) return false;
  if (has(filters.ing) && !filters.ing.some((i) => x.name.toLowerCase().includes(i.toLowerCase()))) return false;
  if (has(filters.concern) && !filters.concern.some((c) => CONCERN_TO_CATEGORY[c] === x.cat)) return false;
  if (has(filters.form)) {
    const n = (x.name + ' ' + x.cs).toLowerCase();
    const matchesForm = filters.form.some((k) => {
      const keyword = FORM_KEYWORD[k];
      if (keyword && n.includes(keyword)) return true;
      if (k === 'Taila / Oil' && n.includes('oil')) return true;
      if (k === 'Syrup / Asava' && n.includes('juice')) return true;
      return false;
    });
    if (!matchesForm) return false;
  }
  if (filters.price) {
    const v = x.price || 0;
    const ranges: Record<string, [number, number]> = {
      'Under ₹200': [0, 200],
      '₹200–₹500': [200, 500],
      '₹500–₹1000': [500, 1000],
      'Above ₹1000': [1000, 1e9],
    };
    const r = ranges[filters.price];
    if (r && !(v >= r[0] && v < r[1])) return false;
  }
  return true;
}

// Ported verbatim from catProducts (line 1601 old / 2948-2954 new): exactly the product at array
// index 1 (id 2, Ashwagandha Capsules) shows "Select Option" (opens the variant-pack sheet) instead
// of a plain "Add to order" button.
const SELECT_OPTION_INDEX = 1;

export interface CatProduct extends RailProduct {
  hasOffer: boolean;
  noOffer: boolean;
  selectOption: boolean;
}

// Ported verbatim from `catProducts` (source line 2948-2954). Margin now comes from the shared
// `marginOf(id)` formula (matching every other rail in the new design), replacing the old design's
// hardcoded per-index CAT_MARGIN array. The rating override array is still hardcoded per-index in the
// new source too, so it's kept as-is.
const CAT_RATING = ['4.5', '4.7', '4.4', '4.6', '4.3', '4.8', '4.5', '4.6', '4.4', '4.7'];

export function getCatProducts(
  cart: CartState,
  loggedIn: boolean,
  query: string,
  category: string,
  filters: FilterSelections,
): CatProduct[] {
  return products
    .map((p, i) => {
      const deco = decorateProduct(p, cart[p.id] || 0, loggedIn);
      return {
        ...deco,
        rating: CAT_RATING[i],
        margin: marginOf(p.id),
        brandUpper: p.brand.toUpperCase(),
        reviewCount: reviewCountOf(p.id),
        hasOffer: !!p.cmp && !p.gated,
        noOffer: !p.cmp && !p.gated,
        selectOption: i === SELECT_OPTION_INDEX,
        discount: p.cmp ? '-' + Math.round((1 - p.price / p.cmp) * 100) + '%' : '',
      };
    })
    .filter((p) => matchesCatFilters(p, category, query, filters));
}

// Ported verbatim from the source's filtered-count helper (line 2960/2966/2972) used by
// catEmptyTitle/Body/Cta — deliberately excludes `sort`, unlike `hasActiveFilters` elsewhere.
export function countNonSortFilters(filters: FilterSelections): number {
  return filters.brand.length + filters.avail.length + filters.ing.length + filters.concern.length + filters.form.length + (filters.price ? 1 : 0);
}
