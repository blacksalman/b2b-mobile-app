import React from 'react';
import { Image } from 'expo-image';

// The AyurvedaOne logo, in the two lockups the brand ships:
//   stacked    - spiral mark above the wordmark; for the auth screens' hero, where there's height
//                to spend and the logo is the only thing on screen.
//   horizontal - mark and wordmark side by side; for the app header, where a stacked lockup shrunk
//                to fit a ~24pt row would render the wordmark at ~6pt, i.e. unreadable.
//
// Both replaced what used to be a hand-drawn LeafMarkIcon plus a letter-spaced "AYURVEDAONE"
// <Text>. One component rather than an inline <Image> per screen so the asset paths and - more
// importantly - the aspect ratios live in one place; getting those wrong squashes the wordmark in a
// way that's obvious to anyone who knows the brand and invisible to anyone who doesn't.
//
// `require`, not a remote uri, so the logo is bundled and paints with the first frame.
const LOCKUPS = {
  stacked: { source: require('../../../assets/images/ayurvedaone-logo.webp'), aspect: 1884 / 835 },
  horizontal: { source: require('../../../assets/images/ayurvedaone-logo-horizontal.webp'), aspect: 1841 / 298 },
} as const;

export type BrandLockup = keyof typeof LOCKUPS;

interface BrandLogoProps {
  /** Which lockup to draw. Defaults to the stacked one. */
  variant?: BrandLockup;
  /** Rendered width in points; height follows from the artwork's own aspect ratio. */
  width?: number;
}

export function BrandLogo({ variant = 'stacked', width = 190 }: BrandLogoProps) {
  const { source, aspect } = LOCKUPS[variant];
  return <Image source={source} style={{ width, height: width / aspect, flexShrink: 0 }} contentFit="contain" />;
}
