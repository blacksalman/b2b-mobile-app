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

// New AyurvedaOne design system (DESIGN-SYSTEM.md §2), pulled fresh from the live Claude Design
// project on 2026-08-24 — a total redesign, not a restyle of `colors` above. Additive only: `colors`
// above stays untouched so every screen not yet migrated keeps rendering exactly as it does today.
// Only screens rebuilt against this new system (Header, TabBar, Home, Search so far) import `ds`.
export const ds = {
  primary: '#25A567',
  primaryStrong: '#1E8A55',
  primaryPress: '#176E43',
  primarySoft: '#DCF5E9',
  primaryInk: '#0C4733',

  accent: '#B0700F',
  accentSoft: '#FCF1E0',

  ink: '#161D1A',
  ink2: '#586360',
  ink3: '#8C9591',
  line: '#E3E7E5',
  lineStrong: '#C8CFCB',
  surface: '#FFFFFF',
  canvas: '#F6F8F7',
  inverse: '#0C4733',

  success: '#DCF5E9',
  successInk: '#1E8A55',
  warning: '#FCF1E0',
  warningInk: '#7F4F0C',
  danger: '#FBEAE8',
  dangerInk: '#A62520',
  info: '#EAEFF7',
  infoInk: '#284A70',
  star: '#D99A28',

  categoryTints: ['#DCF5E9', '#FCF1E0', '#EAEFF7', '#F7EBED', '#F0ECF7', '#EDF1EA'] as const,
} as const;
