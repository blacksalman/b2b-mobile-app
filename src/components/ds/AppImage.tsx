import React, { useState } from 'react';
import {
  Image as RNImage,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

// Every remote image in the app draws through here.
//
// It used to be expo-image. In release builds (Play Store and preview APK alike) that rendered
// every *network* image blank while bundled require()'d assets painted fine - across two unrelated
// hosts, both WebP and PNG, and file sizes from 30 KB to 4 MB, all of which serve HTTP 200 with
// correct content types. Expo Go was unaffected, which is why it survived development.
//
// expo-image routes remote URLs through a Glide model class of its own (SourceMap.kt returns
// UrlModelProvider -> GlideUrlWrapper) whose only loader is registered from a @GlideModule that
// Glide discovers via a KSP-generated class. Local sources skip that path entirely and use Glide's
// built-in loaders - which is exactly the local-works/remote-fails split we saw. Compiling
// expo-image from source rather than as a prebuilt artifact did not fix it, and an okhttp version
// clash was ruled out (React Native 0.86.3 and expo-image both pin 4.9.2), so the precise failure
// inside that path was never pinned down.
//
// React Native's own Image uses Fresco - a completely separate pipeline and network stack - so it
// sidesteps the whole question. The app only ever used `source`, `style` and `contentFit`, so
// nothing is lost in the swap. BrandLogo stays on expo-image: bundled assets were never affected.
//
// The onError branch is deliberate and temporary: if Fresco also fails, its message is painted in
// place of the image so the cause is readable from a screenshot. Strip it once images are
// confirmed working.

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
  const [error, setError] = useState<string | null>(null);
  const uri = typeof source === 'object' && source !== null && 'uri' in source ? String(source.uri ?? '') : '';

  if (error !== null) {
    return (
      <View style={[style as StyleProp<ViewStyle>, styles.errorBox]}>
        <Text style={styles.errorText} numberOfLines={4}>{error || '(empty error)'}</Text>
        <Text style={styles.errorUri} numberOfLines={3}>{uri}</Text>
      </View>
    );
  }

  return (
    <RNImage
      source={source as ImageSourcePropType}
      style={style}
      resizeMode={RESIZE_MODE[contentFit]}
      fadeDuration={transition}
      onError={(event) => setError(String(event?.nativeEvent?.error ?? '(no error field)'))}
    />
  );
}

const styles = StyleSheet.create({
  errorBox: { backgroundColor: '#3B0A0A', padding: 3, justifyContent: 'center' },
  errorText: { color: '#FFD5D5', fontSize: 7, lineHeight: 9 },
  errorUri: { color: '#8FA8FF', fontSize: 6, lineHeight: 8, marginTop: 2 },
});
