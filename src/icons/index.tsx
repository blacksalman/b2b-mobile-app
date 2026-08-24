import Svg, { Circle, Path, Rect } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

// Every path below is copied verbatim from `Various Mobile App - Phone.dc.html` — do not invent
// new paths; if a new icon is needed, extract it from the source file first.

export function LeafLogoIcon({ size = 26, color = '#25A567' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3c1 3-1 4-3 5.5C6.5 10 5 12 6 15c1.3 4 5.5 6 6 6s4.7-2 6-6c1-3-.5-5-3-6.5C13 7 11 6 12 3z" stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
      <Path d="M12 8.5c2 1.5 2 5-1 7" stroke={color} strokeWidth={1.3} strokeLinecap="round" />
    </Svg>
  );
}

// Single-path leaf used in the Categories screen's left rail (line 532) — no inner swoosh.
export function LeafOutlineIcon({ size = 17, color = '#25A567' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3c1 3-1 4-3 5.5C6.5 10 5 12 6 15c1.3 4 5.5 6 6 6s4.7-2 6-6c1-3-.5-5-3-6.5C13 7 11 6 12 3z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  );
}

export function SearchIcon({ size = 17, color = '#6B6B6B' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={6.6} stroke={color} strokeWidth={1.8} />
      <Path d="M16 16l4.5 4.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function CloseIcon({ size = 10, color = '#6B6B6B', strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function ArrowRightIcon({ size = 14, color = '#fff', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h13m-5-6l6 6-6 6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CheckIcon({ size = 12, color = '#25A567', strokeWidth = 2.4 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 17l5-5 4 3 6-7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CheckThinIcon({ size = 9, color = '#25A567' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 13l4 4L19 7" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function TrendUpIcon({ size = 22, color = '#25A567' }: IconProps) {
  return (
    <Svg width={size} height={size * (16 / 22)} viewBox="0 0 24 18" fill="none">
      <Path d="M2 15l7-7 4 3 7-8" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M15 3h5v5" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CartIcon({ size = 16, color = '#25A567' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 5h3l2.5 10h9L21 8H8" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={10} cy={19} r={1.5} fill={color} />
      <Circle cx={18} cy={19} r={1.5} fill={color} />
    </Svg>
  );
}

export function LeafInCircleIcon({ size = 30, color = '#25A567' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 21c-4.4-2.6-7-6-7-10a7 7 0 0 1 7-7 7 7 0 0 1 7 7c0 4-2.6 7.4-7 10z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M12 15V9m0 0c-1.8-.2-3 .8-3 2.4 1.7.3 3-.6 3-2.4zm0 0c1.8-.2 3 .8 3 2.4-1.7.3-3-.6-3-2.4z" stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function QuoteIcon({ width = 20, color = '#DCF5E9' }: { width?: number; color?: string }) {
  const height = width * (18 / 24);
  return (
    <Svg width={width} height={height} viewBox="0 0 24 18" fill="none">
      <Path d="M2 9c0-4 3-7 7-7v3c-2 0-4 2-4 4h4v7H2V9zm11 0c0-4 3-7 7-7v3c-2 0-4 2-4 4h4v7h-7V9z" fill={color} />
    </Svg>
  );
}

export function BackChevronIcon({ size = 20, color = '#222222' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 5l-7 7 7 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Thin back chevron used on Categories' top bar (line 511-513) and the Listing hero (line 656-657) —
// a distinct, smaller glyph from BackChevronIcon (which is the Search screen's own back arrow).
export function SmallBackChevronIcon({ size = 9, color = '#222222' }: IconProps) {
  const height = size * (14 / 8);
  return (
    <Svg width={size} height={height} viewBox="0 0 8 14" fill="none">
      <Path d="M7 1L1 7l6 6" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

export function FilterIcon({ size = 17, color = '#222222' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 6h16M8 12h12M4 18h16" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={6} cy={6} r={1.8} fill={color} />
      <Circle cx={16} cy={12} r={1.8} fill={color} />
      <Circle cx={9} cy={18} r={1.8} fill={color} />
    </Svg>
  );
}

export function MicIcon({ size = 24, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={9} y={3} width={6} height={11} rx={3} stroke={color} strokeWidth={1.8} />
      <Path d="M6 12a6 6 0 0 0 12 0M12 18v3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

// Rating pill chevron (Product screen's rating pill → Reviews, line 867) — a plain arrowhead, distinct
// from ArrowRightIcon's shaft+arrowhead glyph.
export function ChevronRightIcon({ size = 8, color = '#6B6B6B', strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 5l7 7-7 7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Product Description "Read More" chevron (line 1011) — rotated 180° via style when expanded.
export function ChevronDownIcon({ size = 12, color = '#25A567' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// 5-point rating star — filled (rating displays, review list) or outline-with-gold-stroke (the
// write-a-review star picker, line 1224: `fill="{{ rs.fill }}" stroke="#F5B942" stroke-width="1"`).
export function StarIcon({ size = 12, fill = '#F5B942', stroke }: { size?: number; fill?: string; stroke?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
      <Path
        d="M12 2l3.1 6.6 7.2.9-5.3 5 1.4 7.2L12 18l-6.4 3.7 1.4-7.2-5.3-5 7.2-.9z"
        stroke={stroke}
        strokeWidth={stroke ? 1 : 0}
      />
    </Svg>
  );
}

// Cart line remove button (line 1275).
export function TrashIcon({ size = 18, color = '#E15C6D' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Checkout's "Delivery Address" section icon (line 1347).
export function LocationPinIcon({ size = 16, color = '#25A567', strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 21s-7-6.1-7-11.4A7 7 0 0 1 19 9.6C19 14.9 12 21 12 21z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Circle cx={12} cy={9.6} r={2.4} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

// Checkout's "Shipping" section icon (line 1358).
export function ShippingBoxIcon({ size = 16, color = '#25A567' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h10v9H3V6zm10 3h4l3 3v3h-7V9z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
      <Circle cx={7} cy={18} r={1.7} stroke={color} strokeWidth={1.5} />
      <Circle cx={17} cy={18} r={1.7} stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

// Checkout's "Order Summary" section icon (line 1367).
export function ReceiptIcon({ size = 16, color = '#25A567' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 3h12v17l-6-3-6 3V3z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
    </Svg>
  );
}

// Brand-video placeholder play button (line 1155) — solid triangle, no stroke.
export function PlayIcon({ size = 15, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M6 4l14 8-14 8V4z" />
    </Svg>
  );
}

// --- New AyurvedaOne design system icons (Various Mobile App - Phone.dc.html) ---
// Added alongside the icons above, not replacing them — every path below is copied verbatim from
// the new source; see each icon's own comment for its exact location in the source markup.

// Header wordmark leaf mark (showHeader block, line 26) — distinct path from LeafLogoIcon above,
// which stays untouched for the screens still on the old header design.
export function LeafMarkIcon({ size = 22, color = '#25A567' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2a10 10 0 1 0 7.5 16.6" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M12 6a6.5 6.5 0 1 0 4.9 10.8" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
      <Circle cx={12} cy={12} r={2.4} fill={color} />
    </Svg>
  );
}

// Header search-bar magnifier (showHeader block, line 31) — r=7/strokeWidth=1.75, a slightly
// different geometry from the shared SearchIcon (r=6.6/1.8) used elsewhere, so kept separate rather
// than risk shifting SearchIcon's many existing call sites.
export function HeaderSearchIcon({ size = 16, color = '#586360' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={1.75} />
      <Path d="M21 21l-4.3-4.3" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}

// Tab bar icons (tabDef, line 2636-2639) — real per-tab glyphs replacing the old TabBar's plain
// color-swatch placeholders.
export function HomeTabIcon({ size = 24, color = '#586360' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 10.6 12 3.2l9 7.4V20a1 1 0 0 1-1 1h-5.2v-6H10.2v6H5a1 1 0 0 1-1-1v-9.4z" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CategoriesTabIcon({ size = 24, color = '#586360' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 4h6.4v6.4H4V4zm9.6 0H20v6.4h-6.4V4zM4 13.6h6.4V20H4v-6.4zm9.6 0H20V20h-6.4v-6.4z" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CartTabIcon({ size = 24, color = '#586360' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 4h2.3l2.4 11.3a1.7 1.7 0 0 0 1.7 1.3h8.2a1.7 1.7 0 0 0 1.7-1.4L21 8.4H6M9.5 20.5h.01M17.5 20.5h.01" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function AccountTabIcon({ size = 24, color = '#586360' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 11.4a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4zM4.5 21c0-3.7 3.4-6.6 7.5-6.6s7.5 2.9 7.5 6.6" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Mini-cart FAB chevron (line 2445) — same glyph as ChevronRightIcon, kept separate since the FAB
// is out of scope this round (untouched MiniCartFab.tsx); available for when that round comes.
export function FabChevronIcon({ size = 20, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 5l7 7-7 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// "Up to 63% profit margin" tile + "Better margin" USP tile icon (lines 20 & 92) — a checkmark
// trend line + arrow-box glyph, distinct from TrendUpIcon's different path/viewBox above.
export function MarginTrendIcon({ size = 19, color = '#0C4733' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 17l6-6 4 3 8-9" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 5h5v5" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// "Quick delivery" USP tile icon (line 98) — delivery box on wheels.
export function DeliveryBoxIcon({ size = 17, color = '#B0700F' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 7h11v9H3V7zm11 3h4l3 3v3h-7v-6z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Circle cx={7} cy={18} r={1.6} stroke={color} strokeWidth={1.6} />
      <Circle cx={17} cy={18} r={1.6} stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}

// "Authentic ingredients" USP tile icon (line 104) — shield with a checkmark.
export function ShieldCheckIcon({ size = 17, color = '#284A70' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3l7 3v6c0 4-3 7.4-7 9-4-1.6-7-5-7-9V6l7-3z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M9 12l2.2 2.2L15.5 10" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Concern-shelf banner icon (line 356) — a simplified leaf-in-circle, distinct from LeafInCircleIcon
// above (that one has extra side-branch strokes this new glyph drops).
export function ConcernLeafIcon({ size = 19, color = '#0C4733' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 21c-4.4-2.6-7-6-7-10a7 7 0 0 1 7-7 7 7 0 0 1 7 7c0 4-2.6 7.4-7 10z" stroke={color} strokeWidth={1.75} strokeLinejoin="round" />
      <Path d="M12 15V9" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}

// Categories screen's empty-state icon (catEmpty block, line 69-71) — open crate/package glyph.
export function PackageIcon({ size = 28, color = '#0C4733' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 7 12 3 4 7v10l8 4 8-4V7z" stroke={color} strokeWidth={1.75} strokeLinejoin="round" />
      <Path d="M4 7l8 4 8-4M12 21V11" stroke={color} strokeWidth={1.75} strokeLinejoin="round" />
    </Svg>
  );
}

// Product screen's wishlist toggle (line 870) — fill switches between 'none' and primaryInk.
export function HeartIcon({ size = 16, color = '#0C4733', fill = 'none' }: IconProps & { fill?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
      <Path d="M12 21s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 6.5 5.5 5.5 0 0 1 21.5 12c-2.5 4.65-9.5 9-9.5 9z" stroke={color} strokeWidth={1.75} strokeLinejoin="round" />
    </Svg>
  );
}

// Product screen trust-badge row (trustBadgesProduct, line 2690) — 4 icons, each copied verbatim.
export function GstInvoiceIcon({ size = 16, color = '#0C4733' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M9 8h6M9 12h6" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  );
}

export function GenuineCheckIcon({ size = 16, color = '#0C4733' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.6} />
      <Path d="M8 12.5l2.5 2.5L16 9.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function EasyReturnsIcon({ size = 16, color = '#0C4733' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 12a9 9 0 1 0 3-6.7" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M3 4v4h4" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function AyushLicenseIcon({ size = 16, color = '#0C4733' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={9} r={5} stroke={color} strokeWidth={1.6} />
      <Path d="M8.5 13.5L7 21l5-2.5L17 21l-1.5-7.5" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
    </Svg>
  );
}

// Checkout's payment-processing sheet icon (line 1560).
export function ProcessingSparkleIcon({ size = 24, color = '#1E8A55' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// Checkout's payment-cancelled sheet icon (line 1587).
export function AlertCircleIcon({ size = 24, color = '#B0700F' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.8} />
      <Path d="M12 8v5M12 16h.01" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

// Checkout's "Return, refund & cancellation" policy row icon (line 1518).
export function ReturnPolicyIcon({ size = 18, color = '#0C4733' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 4v6h6M20 20v-6h-6" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M4.5 15a8 8 0 0 0 14.3 3.3M19.5 9a8 8 0 0 0-14.3-3.3" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

// Account screen's logged-out person icon (screen_Account.html line 21).
export function PersonCircleIcon({ size = 26, color = '#0C4733' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={3.6} stroke={color} strokeWidth={1.8} />
      <Path d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

// Account screen's policy-row / About Us icon (screen_Account.html line 33).
export function InfoCircleIcon({ size = 17, color = '#0C4733' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.6} />
      <Path d="M12 8h.01M11 12h1v5h1" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Account screen's Contact Us row icon (screen_Account.html line 52).
export function ContactIcon({ size = 17, color = '#0C4733' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Account screen's Edit Profile row icon (screen_Account.html line 70).
export function EditPencilIcon({ size = 16, color = '#0C4733' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Account screen's "My Orders" menu tile icon (screen_Account.html line 78).
export function OrdersIcon({ size = 17, color = '#0C4733' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 8h16l-1 12H5L4 8zM8 8V6a4 4 0 0 1 8 0v2" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
    </Svg>
  );
}

// Account screen's Sign Out button icon (screen_Account.html line 124).
export function LogoutIcon({ size = 15, color = '#A62520' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Addresses screen's "Add Address" header action (various-mobile-app-phone.dc.html line 1793).
export function PlusIcon({ size = 15, color = '#0C4733', strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

// Addresses screen's per-card remove button (various-mobile-app-phone.dc.html line ~1810) — distinct
// path from TrashIcon (rx 2 vs 1, longer handle), copied verbatim rather than reused.
export function AddressRemoveIcon({ size = 14, color = '#A62520' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 7h14M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-8 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Order Detail/Order Confirmed's list-row forward chevron (various-mobile-app-phone.dc.html line 40) —
// same shape family as SmallBackChevronIcon, mirrored; copied as its own path rather than derived via
// a transform.
export function SmallForwardChevronIcon({ size = 8, color = '#586360' }: IconProps) {
  const height = size * (14 / 8);
  return (
    <Svg width={size} height={height} viewBox="0 0 8 14" fill="none">
      <Path d="M1 1l6 6-6 6" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

// Order Detail/Order Confirmed's "Order Summary"/"Order information" card icon (various-mobile-app-
// phone.dc.html line 26) — an open cube/parcel glyph, distinct from ShippingBoxIcon/ReceiptIcon.
export function OrderBoxIcon({ size = 15, color = '#0C4733' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
    </Svg>
  );
}

// Order Confirmed's "Delivery Address" row icon (various-mobile-app-phone.dc.html line 35) — a
// delivery-truck glyph, distinct from ShippingBoxIcon.
export function DeliveryTruckIcon({ size = 15, color = '#0C4733' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 11l1.5-4.5A2 2 0 0 1 6.4 5h11.2a2 2 0 0 1 1.9 1.5L21 11m-18 0v6a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h12v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-6m-18 0h18"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Order Detail's "Order Items" section icon (various-mobile-app-phone.dc.html line 56) — a shopping
// bag glyph, distinct from CartIcon.
export function ShoppingBagIcon({ size = 15, color = '#0C4733' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 8h16l-1 12H5L4 8zM8 8V6a4 4 0 0 1 8 0v2" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
    </Svg>
  );
}
