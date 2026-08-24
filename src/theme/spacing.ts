export const spacing = {
  xs: 4,
  sm: 6,
  md: 9,
  lg: 14,
  xl: 16,
  xxl: 22,
} as const;

export const radii = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 11,
  xl: 12,
  card: 16,
  cardLg: 18,
  pill: 999,
} as const;

// New AyurvedaOne design system (DESIGN-SYSTEM.md §4/§5) — additive, `spacing`/`radii` above stay
// as-is for screens not yet migrated.
export const dsSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 32,
} as const;

export const dsRadii = {
  chip: 4,
  input: 8,
  button: 12,
  sheet: 16,
  pill: 999,
} as const;
