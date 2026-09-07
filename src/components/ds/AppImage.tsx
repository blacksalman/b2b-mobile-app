import React from 'react';
import {
  Image as RNImage,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
} from 'react-native';

// Every remote image in the app draws through here.
//
// It used to be expo-image, which rendered every *network* image blank in release builds while
// bundled require()'d assets painted fine. That held across two unrelated hosts, both WebP and PNG,
// and file sizes from 30 KB to 4 MB - all serving HTTP 200 with correct content types, and all fine
// in Expo Go, which is why it survived development. The app's own fetch() reaches those same hosts
// over HTTPS successfully, so the device's network and certificates were never in question: the
// only thing that failed was expo-image's remote path specifically.
//
// That path is genuinely separate from its local one. SourceMap.kt runs every source through the
// local branches first (content/data URLs, resource URIs, file URIs); anything left over becomes a
// GlideUrlWrapper, a model class Glide has no built-in loader for. Its only loader is registered by
// ExpoImageOkHttpClientGlideModule, which Glide reaches through a KSP-generated registry class.
// Local sources never go near it - they resolve to plain String/Uri models whose loaders always
// exist. Hence bundled images working while every URL failed. Compiling expo-image from source
// rather than as a prebuilt artifact didn't help, and an okhttp clash was ruled out (React Native
// 0.86.3 and expo-image both pin 4.9.2), so the fault inside that path was never pinned down.
//
// React Native's own Image runs on Fresco - a separate decoder and a separate network stack - and
// loads all of them. The app only ever passed source, style, contentFit and one transition, so
// nothing is lost in the swap. BrandLogo stays on expo-image: bundled assets were never affected.

type ContentFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';

const RESIZE_MODE = {
  cover: 'cover',
  contain: 'contain',
  fill: 'stretch',
  none: 'center',
  'scale-down': 'contain',
} as const;

interface AppImageProps {
  source: ImageSourcePropType | { uri: string };
  style?: StyleProp<ImageStyle>;
  contentFit?: ContentFit;
  /** expo-image's fade-in duration in ms; Android's Fresco spells the same thing `fadeDuration`. */
  transition?: number;
}

export function AppImage({ source, style, contentFit = 'cover', transition }: AppImageProps) {
  return (
    <RNImage
      source={source as ImageSourcePropType}
      style={style}
      resizeMode={RESIZE_MODE[contentFit]}
      fadeDuration={transition}
    />
  );
}
