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
