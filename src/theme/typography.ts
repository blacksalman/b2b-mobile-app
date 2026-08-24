export const fontFamily = {
  400: 'DMSans_400Regular',
  500: 'DMSans_500Medium',
  600: 'DMSans_600SemiBold',
  700: 'DMSans_700Bold',
} as const;

export type FontWeightKey = keyof typeof fontFamily;

// Role presets matching the source design's type scale (spec: h1/h2/h3/body/meta/price/button/eyebrow).
// New AyurvedaOne design system (DESIGN-SYSTEM.md §3) — Inter, weights 700/600/400 only (no 500).
// Additive alongside `fontFamily`/`type` above: those stay DM Sans for screens not yet migrated.
export const dsFontFamily = {
  400: 'Inter_400Regular',
  600: 'Inter_600SemiBold',
  700: 'Inter_700Bold',
} as const;

export type DsFontWeightKey = keyof typeof dsFontFamily;

// letterSpacing values below are the spec's em tracking converted to px at each role's fontSize
// (RN's letterSpacing is px-only), e.g. display: -0.02em * 30px = -0.6.
export const dsType = {
  display: { fontFamily: dsFontFamily[700], fontSize: 30, lineHeight: 36, letterSpacing: -0.6, color: '#161D1A' },
  h1: { fontFamily: dsFontFamily[700], fontSize: 22, lineHeight: 28, letterSpacing: -0.44, color: '#161D1A' },
  h2: { fontFamily: dsFontFamily[700], fontSize: 18, lineHeight: 24, letterSpacing: -0.18, color: '#161D1A' },
  h3: { fontFamily: dsFontFamily[600], fontSize: 16, lineHeight: 22, letterSpacing: -0.16, color: '#161D1A' },
  title: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: '#161D1A' },
  body: { fontFamily: dsFontFamily[400], fontSize: 14, lineHeight: 21, color: '#161D1A' },
  label: { fontFamily: dsFontFamily[600], fontSize: 13, lineHeight: 18, color: '#586360' },
  meta: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: '#586360' },
  micro: { fontFamily: dsFontFamily[600], fontSize: 11, lineHeight: 14, letterSpacing: 0.22, color: '#161D1A' },
  eyebrow: {
    fontFamily: dsFontFamily[700],
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.32,
    textTransform: 'uppercase' as const,
    color: '#586360',
  },
};

export const type = {
  h1: { fontFamily: fontFamily[700], fontSize: 21, color: '#222222' },
  h2: { fontFamily: fontFamily[700], fontSize: 19, color: '#222222' },
  h3: { fontFamily: fontFamily[600], fontSize: 13, color: '#222222' },
  body: { fontFamily: fontFamily[400], fontSize: 12.5, color: '#6B6B6B' },
  meta: { fontFamily: fontFamily[400], fontSize: 10, color: '#6B6B6B' },
  price: { fontFamily: fontFamily[700], fontSize: 16, color: '#25A567' },
  button: { fontFamily: fontFamily[600], fontSize: 13, color: '#FFFFFF' },
  eyebrow: {
    fontFamily: fontFamily[600],
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
};
