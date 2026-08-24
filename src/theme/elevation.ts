// New AyurvedaOne design system (DESIGN-SYSTEM.md §6) — three elevation steps, no more.
// RN 0.81 (this project's installed version, confirmed via
// node_modules/react-native/types_generated/.../StyleSheetTypes.d.ts) supports the `boxShadow`
// style prop taking a raw CSS box-shadow string on both iOS and Android (New Architecture), so the
// spec's rgba values translate directly with no shadowColor/shadowOffset/shadowOpacity/shadowRadius
// split needed.
export const dsElevation = {
  e1: { boxShadow: '0 1px 2px rgba(12,71,51,.05)' },
  e2: { boxShadow: '0 -2px 8px rgba(12,71,51,.06)' },
  e3: { boxShadow: '0 -8px 24px rgba(12,71,51,.12)' },
} as const;
