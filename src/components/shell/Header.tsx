import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ds } from '@/theme';
import { HeaderSearchIcon } from '@/icons';
import { BrandLogo } from '@/components/shell/BrandLogo';
import { RotatingSearchPlaceholder } from '@/components/shell/RotatingSearchPlaceholder';

// Rebuilt against the new AyurvedaOne design system (`showHeader` block, Various Mobile App - Phone
// .dc.html line 23-36): flat `canvas` background (no border/shadow), leaf mark + wordmark row, then
// a search-bar pill that navigates to /search on tap (it's a static row in the source, not a live
// text input — the real input lives on the Search screen itself). The source pads 54px from the top
// of its fixed 402x874 phone-frame mock; real devices vary, so this reproduces the same visual gap
// via the device's actual safe-area inset instead of a hardcoded 54px, same approach as the previous
// header build.
export function Header() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <Pressable style={styles.brandRow} onPress={() => router.push('/')} hitSlop={8}>
        <BrandLogo variant="horizontal" width={180} />
      </Pressable>
      <Pressable style={styles.searchBar} onPress={() => router.push('/search')}>
        <HeaderSearchIcon size={16} />
        {/* Never paused: this pill is a link to /search, not a real field, so there is no typed
            text for the animation to sit under. */}
        <RotatingSearchPlaceholder color={ds.ink2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: ds.canvas,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    // minHeight, not height: the row grows if the platform's font scale pushes the text past
    // one line, instead of clipping it.
    minHeight: 48,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ds.line,
    backgroundColor: ds.surface,
  },
});
