import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamily } from '@/theme';
import { LeafLogoIcon, SearchIcon } from '@/icons';

// Ported verbatim from the shared header (lines 22-38): white bg, bottom border, leaf logo + wordmark
// (tap -> home), search-bar pill below (tap -> search). Source pads 66px from the top of its fixed
// 402x874 phone-frame mock (status bar + 12px breathing room); real devices vary, so we reproduce the
// same visual gap via the device's actual safe-area inset instead of a hardcoded 66px.
export function Header() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <View style={styles.row}>
        <Pressable style={styles.brandRow} onPress={() => router.push('/')} hitSlop={8}>
          <LeafLogoIcon size={26} />
          <Text style={styles.wordmark}>AYURVEDAONE</Text>
        </Pressable>
      </View>
      <Pressable style={styles.searchBar} onPress={() => router.push('/search')}>
        <SearchIcon size={17} color={colors.bodyGray} />
        <Text style={styles.searchPlaceholder}>Search 3,400+ Ayurvedic SKUs</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wordmark: {
    fontFamily: fontFamily[700],
    fontSize: 15,
    color: colors.charcoal,
    letterSpacing: 1.2,
  },
  searchBar: {
    marginTop: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    height: 44,
    paddingHorizontal: 12,
    borderWidth: 1.4,
    borderColor: colors.borderGray,
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  searchPlaceholder: {
    fontFamily: fontFamily[400],
    fontSize: 13.5,
    color: colors.bodyGray,
    flex: 1,
  },
});
