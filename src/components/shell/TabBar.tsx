import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ds, dsFontFamily } from '@/theme';
import { HomeTabIcon, CategoriesTabIcon, CartTabIcon, AccountTabIcon } from '@/icons';

const TABS = [
  { name: 'Home', path: '/' as const, Icon: HomeTabIcon },
  { name: 'Categories', path: '/categories' as const, Icon: CategoriesTabIcon },
  { name: 'Cart', path: '/cart' as const, Icon: CartTabIcon },
  { name: 'Me', path: '/account' as const, Icon: AccountTabIcon },
];

// Rebuilt against the new AyurvedaOne design system (`tabs` render block, Various Mobile App - Phone
// .dc.html line 2451-2468): real per-tab SVG icon glyphs (tabDef, line 2636-2639) replacing the old
// bordered-square color swatches, a 32x3 indicator pill on the active tab's top edge. No cart-count
// badge on the Cart tab icon - the floating MiniCartFab pill already shows that count. Per this
// app's standing "tab bar must never hide" decision (see (tabs)/_layout.tsx's own comment — the
// source hides this bar on the product screen via `notProduct`, but this app deliberately keeps it
// visible everywhere), that guard is not reproduced here, same as the prior TabBar build.
export function TabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 28 }]}>
      {TABS.map(({ name, path, Icon }) => {
        const active = pathname === path;
        const color = active ? ds.primaryInk : ds.ink2;
        return (
          <Pressable key={path} style={styles.tab} onPress={() => router.push(path)}>
            {active && <View style={styles.activeIndicator} />}
            <View style={styles.iconWrap}>
              <Icon size={24} color={color} />
            </View>
            <Text style={[styles.label, { color }]}>{name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: ds.surface,
    borderTopWidth: 1,
    borderTopColor: ds.line,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  activeIndicator: {
    position: 'absolute',
    top: -9,
    width: 32,
    height: 3,
    borderRadius: 999,
    backgroundColor: ds.primary,
  },
  iconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: dsFontFamily[600],
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
  },
});
