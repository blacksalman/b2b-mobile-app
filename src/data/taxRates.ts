import { fetchTaxRates } from '@/lib/medusaClient';

// In-memory cache of real per-product-type GST rates (see the backend's /store/tax-rates route
// for why this exists: GET /store/products never computes tax at all - that normally needs a
// shipping destination, which isn't known while just browsing - so a product card/detail page
// can't show a real "final price including tax" without knowing the applicable rate itself).
// Hydrated once at app boot (AppStateContext, alongside hydrateCartState/hydrateToken) so it's
// already available by the time the first product renders; getTaxRateForProductType is a plain
// synchronous read (used inside homeApi.ts's toProduct, which isn't async) and simply falls back
// to 0% if called before hydration finishes, same "no data yet = no fabricated number" fallback
// used elsewhere in this app.
let cache: { defaultRate: number; byProductType: Record<string, number> } | null = null;
let hydratePromise: Promise<void> | null = null;

export function hydrateTaxRates(): Promise<void> {
  if (!hydratePromise) {
    hydratePromise = fetchTaxRates()
      .then((data) => {
        cache = data;
      })
      .catch(() => {
        // Stays null - getTaxRateForProductType falls back to 0% rather than guessing.
      });
  }
  return hydratePromise;
}

export function getTaxRateForProductType(typeId: string | null | undefined): number {
  if (!cache) return 0;
  if (typeId && typeId in cache.byProductType) return cache.byProductType[typeId];
  return cache.defaultRate;
}
