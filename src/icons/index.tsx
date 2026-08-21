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

export function ArrowRightIcon({ size = 14, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h13m-5-6l6 6-6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
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
export function ChevronRightIcon({ size = 8, color = '#6B6B6B' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 5l7 7-7 7" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
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
export function LocationPinIcon({ size = 16, color = '#25A567' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 21s-7-6.1-7-11.4A7 7 0 0 1 19 9.6C19 14.9 12 21 12 21z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
      <Circle cx={12} cy={9.6} r={2.4} stroke={color} strokeWidth={1.7} />
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
