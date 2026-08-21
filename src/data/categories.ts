import type { Category } from './types';

// Ported verbatim from the source prototype's `const CATS = [...]` array (line 1362).
export const categories: Category[] = [
  { name: 'Classical Medicines', count: 702, tint: '#DCF5E9' },
  { name: 'Rasayana & Immunity', count: 441, tint: 'rgba(225,92,109,.16)' },
  { name: "Women's Health", count: 178, tint: 'rgba(74,143,199,.14)' },
  { name: 'Diabetes Care', count: 963, tint: 'rgba(217,169,78,.18)' },
  { name: 'Joint & Muscle Care', count: 214, tint: 'rgba(217,169,78,.2)' },
  { name: 'Skin & Hair Care', count: 388, tint: '#DCF5E9' },
  { name: 'Health supplement', count: 126, tint: 'rgba(74,143,199,.12)' },
  { name: 'Personal Care', count: 180, tint: 'rgba(74,143,199,.12)' },
  { name: "Children's Ayurveda", count: 64, tint: 'rgba(155,127,206,.16)' },
  { name: 'Panchakarma Kits', count: 38, tint: 'rgba(217,169,78,.2)' },
];
