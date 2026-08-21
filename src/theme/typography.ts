export const fontFamily = {
  400: 'DMSans_400Regular',
  500: 'DMSans_500Medium',
  600: 'DMSans_600SemiBold',
  700: 'DMSans_700Bold',
} as const;

export type FontWeightKey = keyof typeof fontFamily;

// Role presets matching the source design's type scale (spec: h1/h2/h3/body/meta/price/button/eyebrow).
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
