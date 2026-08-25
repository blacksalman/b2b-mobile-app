// Stable string-id -> number bridge so real Medusa products can flow through the existing
// numeric-keyed cart/wishlist state (CartState = Record<number, number>) and the existing
// decorate pipeline without changing either. Split into its own module (rather than living in
// homeApi.ts, where it started) because cartSync.ts also needs it to recompute the same hash
// when rehydrating a persisted cart, and homeApi.ts already imports from cartSync.ts - keeping
// it here avoids a cycle between the two.
// Range starts at 100000, clear of the mock catalog's ids (1-10).
export function hashProductId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return 100000 + (h % 900000);
}

// Every screen that opens a product detail page routes through this: real (API-backed)
// products use their real handle as the URL slug ("/product/nurall-capsule-..."), readable and
// - unlike the numeric hashId - resolvable directly against the backend on a cold page
// load/refresh (see productDetailApi.ts). Mock-catalog products (ids 1-10, still used by Buy
// again/Fast-moving/Listing) have no real handle, so they fall back to the numeric id exactly
// as before.
export function productHref(p: { id: number; handle?: string }): `/product/${string}` {
  return `/product/${p.handle ?? p.id}`;
}
