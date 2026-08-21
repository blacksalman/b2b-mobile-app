export const colors = {
  brandGreen: '#25A567',
  mintTint: '#DCF5E9',
  forestGreen: '#0F3D2E',
  gold: '#D9A94E',
  orange: '#E8875A',
  purple: '#9B7FCE',
  coral: '#E15C6D',
  skyBlue: '#4A8FC7',
  charcoal: '#222222',
  bodyGray: '#6B6B6B',
  borderGray: '#E2E2E2',
  cardBg: '#F5F5F5',
  starYellow: '#F5B942',
  white: '#FFFFFF',
  black: '#000000',
  filterOptionBorder: 'rgba(0,0,0,.18)',
  closeChipBg: '#E2E2E2',
} as const;

export function withOpacity(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
