import { money } from '@/utils/money';

// Ported verbatim from `various-mobile-app-phone.dc.html`'s `ORDERS`/`ORDER_STATUS_STYLE` consts and
// the `orderTabs`/`filteredOrders`/`ordersEmpty`/`orderDetail` renderVals() logic (source lines
// 2487-2505, 2649-2661) — all fully in range, well before this project's known 256KB `get_file`
// truncation point (~line 3143). Nothing here is inferred.

export type OrderStatus = 'Confirmed' | 'In Transit' | 'Delivered';

export interface OrderAddress {
  name: string;
  line: string;
  cityState: string;
  phone: string;
}

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
  tint: string;
}

export interface OrderEntry {
  id: number;
  date: string;
  dateFull: string;
  status: OrderStatus;
  total: number;
  dispatch: string;
  delivery: string;
  addr: OrderAddress;
  items: OrderItem[];
}

export const ORDERS: OrderEntry[] = [
  {
    id: 24,
    date: 'Aug 20, 2026',
    dateFull: '20 Aug 2026, 11:42 am',
    status: 'Confirmed',
    total: 665,
    dispatch: '20 Aug',
    delivery: '20 Aug',
    addr: { name: 'Tom Sharma', line: 'T9, Koramangala 4th Block', cityState: 'Bangalore, Karnataka 560001', phone: '+91 96569 50687' },
    items: [{ name: 'Nurall Capsule (60 Caps) — Ayurveda Originals', qty: 1, price: 590, tint: '#FCF1E0' }],
  },
  {
    id: 23,
    date: 'Aug 19, 2026',
    dateFull: '19 Aug 2026, 3:10 pm',
    status: 'Confirmed',
    total: 665,
    dispatch: '19 Aug',
    delivery: '19 Aug',
    addr: { name: 'Tom Sharma', line: 'T9, Koramangala 4th Block', cityState: 'Bangalore, Karnataka 560001', phone: '+91 96569 50687' },
    items: [{ name: 'Nurall Capsule (60 Caps) — Ayurveda Originals', qty: 1, price: 590, tint: '#FCF1E0' }],
  },
  {
    id: 21,
    date: 'Aug 14, 2026',
    dateFull: '14 Aug 2026, 10:05 am',
    status: 'In Transit',
    total: 1240,
    dispatch: '14 Aug',
    delivery: '22 Aug',
    addr: { name: 'Tom Sharma', line: 'T9, Koramangala 4th Block', cityState: 'Bangalore, Karnataka 560001', phone: '+91 96569 50687' },
    items: [
      { name: 'Triphala Churna — Himvin Ayurveda', qty: 2, price: 368, tint: '#FCF1E0' },
      { name: 'Ashwagandha Capsules — Kailasha Herbals', qty: 1, price: 504, tint: '#EAEFF7' },
    ],
  },
  {
    id: 18,
    date: 'Aug 8, 2026',
    dateFull: '8 Aug 2026, 5:32 pm',
    status: 'Delivered',
    total: 980,
    dispatch: '8 Aug',
    delivery: '12 Aug',
    addr: { name: 'Tom Sharma', line: 'T9, Koramangala 4th Block', cityState: 'Bangalore, Karnataka 560001', phone: '+91 96569 50687' },
    items: [{ name: 'Brahmi Ghrita — Kailasha Herbals', qty: 1, price: 980, tint: '#DCF5E9' }],
  },
];

// Hex values match `ds.primaryInk`/`ds.primarySoft` (Confirmed/Delivered) and `ds.warningInk`/`ds.warning`
// (In Transit) exactly — kept as a lookup by status name rather than importing the theme here, since
// this is a pure data module.
export const ORDER_STATUS_STYLE: Record<OrderStatus, { color: string; bg: string }> = {
  Confirmed: { color: '#0C4733', bg: '#DCF5E9' },
  'In Transit': { color: '#7F4F0C', bg: '#FCF1E0' },
  Delivered: { color: '#0C4733', bg: '#DCF5E9' },
};

export const ORDER_TAB_NAMES: OrderStatus[] = ['Confirmed', 'In Transit', 'Delivered'];

export function ordersByStatus(status: OrderStatus): OrderEntry[] {
  return ORDERS.filter((o) => o.status === status);
}

export function findOrder(id: number): OrderEntry {
  // Ported verbatim from `ORDERS.find(x=>x.id===s.orderDetailId)||ORDERS[0]` — a genuine source quirk
  // this preserves rather than fixes: Checkout's `confirmOrder` always hands off id 29, which isn't in
  // `ORDERS` (real ids are 24/23/21/18), so "View order" from Order Confirmed always actually lands on
  // order #24's detail via this fallback, not a real #29.
  return ORDERS.find((o) => o.id === id) ?? ORDERS[0];
}

export function orderItemCount(o: OrderEntry): number {
  return o.items.reduce((a, i) => a + i.qty, 0);
}

export function orderTotalLabel(o: OrderEntry): string {
  return money(o.total);
}

// Ported verbatim from Checkout's `confirmOrder`/`retryPayment` (source lines 3130-3131):
// `orderConfirmedId:s.orderConfirmedId||29` — always 29 in this app, there is no path that ever sets
// it to anything else. Shared here so Checkout and Order Confirmed agree on the same constant.
export const ORDER_CONFIRMED_ID = 29;
