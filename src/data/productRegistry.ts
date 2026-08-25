import type { Product } from './types';

// Populated by homeApi.ts's toRailProduct as each real (API-backed) product is decorated, so
// anything keyed purely by the mock catalog - computeCartTotals in cartTotals.ts being the one
// that actually crashed on this - can resolve a real product's price/name/etc the same way it
// already resolves a mock one, instead of assuming every cart id lives in products.ts (ids 1-10
// only). See: adding a real product to cart crashed the whole AppStateProvider tree because
// computeCartTotals did an unconditional `products.find(...)!` for every id in cart.
const registry = new Map<number, Product>();

export function registerProduct(product: Product): void {
  registry.set(product.id, product);
}

export function getRegisteredProduct(id: number): Product | undefined {
  return registry.get(id);
}
