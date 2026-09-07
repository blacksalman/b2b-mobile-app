import React, { useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image, type ImageProps } from 'expo-image';

// TEMPORARY diagnostic wrapper around expo-image.
//
// The Play Store / preview builds render every *remote* image blank while the bundled logo
// (BrandLogo, a require()'d asset through the same expo-image component) paints fine, and the
// Store API calls to the very same host succeed. expo-image loads over React Native's own OkHttp
// client (ExpoImageOkHttpClientGlideModule -> OkHttpClientProvider.createClient()), so on paper
// the image requests and the JSON requests are indistinguishable at the network layer - which is
// why static analysis has run out of road here.
//
// Rather than keep theorising, this paints Glide's actual failure string in the space the image
// would have occupied, so a sideloaded APK can be read off the screen without adb. Swap the
// `Image` imports in index.tsx back and delete this file once the cause is known.
export function DiagImage(props: ImageProps) {
  const [error, setError] = useState<string | null>(null);
  const uri = typeof props.source === 'object' && props.source !== null && 'uri' in props.source
    ? String((props.source as { uri?: unknown }).uri ?? '')
    : '<non-uri source>';

  if (error !== null) {
    return (
      <View style={[props.style as StyleProp<ViewStyle>, styles.box]}>
        <Text style={styles.err} numberOfLines={4}>{error || '(empty error)'}</Text>
        <Text style={styles.uri} numberOfLines={3}>{uri}</Text>
      </View>
    );
  }

  return <Image {...props} onError={(event) => setError(String(event?.error ?? '(no error field)'))} />;
}

const styles = StyleSheet.create({
  box: { backgroundColor: '#3B0A0A', padding: 3, justifyContent: 'center' },
  err: { color: '#FFD5D5', fontSize: 7, lineHeight: 9 },
  uri: { color: '#8FA8FF', fontSize: 6, lineHeight: 8, marginTop: 2 },
});
