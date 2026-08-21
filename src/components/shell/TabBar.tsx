import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamily } from '@/theme';
import { useAppState } from '@/state/AppStateContext';

const TABS = [
  { name: 'Home', path: '/' as const },
  { name: 'Categories', path: '/categories' as const },
  { name: 'Cart', path: '/cart' as const },
  { name: 'Me', path: '/account' as const },
];

// Ported verbatim from the source's tab bar (line 1325): white bg, top border, 4 tabs, each a plain
// 22x22 bordered-square "icon" swatch (no per-tab icon art in the source — just border/fill color
// change on active state) + label. Active = brand green, inactive = body gray. Cart tab shows an
// orange badge with the total case count when non-empty. Per the plan's architecture note, this bar
// must stay visible on every screen (all 13 source screens have no showHeader-style guard on it), so
// it's rendered once in `(tabs)/_layout.tsx` alongside a plain <Slot/> rather than via a navigator
// that could hide it on pushed screens.
export function TabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { cartCases } = useAppState();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 9 }]}>
      {TABS.map((tab) => {
        const active = pathname === tab.path;
        const color = active ? colors.brandGreen : colors.bodyGray;
        const badge = tab.path === '/cart' && cartCases > 0 ? String(cartCases) : '';
        return (
          <Pressable key={tab.path} style={styles.tab} onPress={() => router.push(tab.path)}>
            <View style={[styles.swatch, { borderColor: color, backgroundColor: active ? color : 'transparent' }]} />
            <Text style={[styles.label, { color }]}>{tab.name}</Text>
            {!!badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
    paddingTop: 9,
    paddingHorizontal: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.8,
  },
  label: {
    fontFamily: fontFamily[500],
    fontSize: 9.5,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: '22%',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontFamily: fontFamily[600],
    fontSize: 9,
    color: colors.white,
  },
});
