import type { Product } from './types';

// Ported verbatim from the source prototype's `const P = [...]` array (Various Mobile App - Phone.dc.html, line 1350).
export const products: Product[] = [
  { id: 1, name: 'Triphala Churna', brand: 'Himvin Ayurveda', cs: 'Box of 100 × 100g pouches', price: 18.40, cmp: 22.00, tint: 'rgba(217,169,78,.22)', cat: 'Classical Medicines', badge: 'Deal' },
  { id: 2, name: 'Ashwagandha Capsules', brand: 'Kailasha Herbals', cs: 'Box of 50 × 60 caps', price: 7.50, cmp: 10.00, tint: 'rgba(74,143,199,.18)', cat: 'Rasayana & Immunity', badge: '-25%' },
  { id: 3, name: 'Mahanarayan Taila', brand: 'Sanjivani Ayurveda', cs: 'Case of 24 × 200ml', price: 14.50, cmp: 19.00, tint: 'rgba(225,92,109,.16)', cat: 'Joint & Muscle Care', badge: 'Highly rated' },
  { id: 4, name: 'Chandraprabha Vati Combo', brand: 'Kailasha Herbals', cs: 'Box of 20 × 40 tabs', price: 21.00, tint: '#F5F5F5', cat: 'Classical Medicines' },
  { id: 5, name: 'Kumaryasava', brand: 'Divya Aushadhi', cs: 'Case of 12 × 450ml', price: 16.80, tint: '#F5F5F5', cat: "Women's Health" },
  { id: 6, name: 'Kumkumadi Taila Premium', brand: 'Sanjivani Ayurveda', cs: 'Case of 6 × 10ml', price: 9.88, cmp: 12.00, tint: 'rgba(155,127,206,.18)', cat: 'Skin & Hair Care', badge: 'Deal' },
  { id: 7, name: 'Madhumeha Churna', brand: 'Himvin Ayurveda', cs: 'Box of 30 × 100g', price: 26.00, cmp: 31.00, tint: 'rgba(217,169,78,.18)', cat: 'Diabetes Care' },
  { id: 8, name: 'Bhringraj Hair Oil', brand: 'Sanjivani Ayurveda', cs: 'Case of 24 × 200ml', price: 8.49, cmp: 10.99, tint: '#F5F5F5', cat: 'Skin & Hair Care', badge: '-23%' },
  { id: 9, name: 'Yograj Guggulu', brand: 'Divya Aushadhi', cs: 'Box of 20 × 100 tabs', price: 24.50, tint: 'rgba(225,92,109,.14)', cat: 'Joint & Muscle Care' },
  { id: 10, name: 'Amla Juice Concentrate', brand: 'Wellveda Naturals', cs: 'Case of 12 × 1L', price: 15.20, tint: 'rgba(74,143,199,.14)', cat: 'Rasayana & Immunity' },
];

export function productById(id: number): Product | undefined {
  return products.find((p) => p.id === id);
}

// Ported verbatim from the source's `P.filter(x=>x.cat===...)`/`P.filter(x=>x.brand===...)` id lists
// used to build `listingIds` for the Listing screen (e.g. prescription groups, brand cards, promo
// banners). Order is ascending product id, matching `Array.prototype.filter`'s natural order — the
// source does NOT preserve any custom ordering passed into `listingIds`, since the actual product
// list rendered on the Listing screen is always `P.filter(x=>s.listingIds.includes(x.id))`, which
// iterates P (ascending id) and just tests membership.
export function productIdsByCategory(cat: string): number[] {
  return products.filter((p) => p.cat === cat).map((p) => p.id);
}

export function productIdsByBrand(brand: string): number[] {
  return products.filter((p) => p.brand === brand).map((p) => p.id);
}
