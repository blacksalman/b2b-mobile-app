import { useState } from 'react';
import { Tabs } from 'expo-router';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { TabBar } from '@/components/shell/TabBar';
import { Toast } from '@/components/shell/Toast';

// All source screens are siblings under this one real `<Tabs/>` navigator (see plan's "Tab Bar Must
// Never Hide" note) so the custom TabBar below — rendered via the `tabBar` prop, not a `<Slot/>`
// hack — is always on screen for every route, matching the source's tab bar having no
// showHeader-style guard.
//
// This replaces a prior `<Slot/>`-based shell that caused a multi-second stall on every tab switch:
// `<Slot/>` with no `<Navigator>` ancestor falls back to a StackRouter-backed SlotNavigator, and with
// no `getId`/`singular` configured, every `router.push()` appended a brand-new route onto an
// ever-growing, never-cleaned-up history (node_modules/expo-router/build/layouts/StackClient.js).
// A real `<Tabs/>` is TabRouter-backed instead — switching screens is a JUMP_TO/NAVIGATE focus
// change, no history growth. Every `router.push()` call site elsewhere in the app (TabBar included)
// keeps working unchanged: expo-router auto-downgrades a PUSH to NAVIGATE whenever the target
// navigator's type isn't 'stack' (verified at
// node_modules/expo-router/build/global-state/routing.js:232), so nothing else needed to change.
export default function TabsLayout() {
  const [tabBarHeight, setTabBarHeight] = useState(80);

  const onTabBarLayout = (e: LayoutChangeEvent) => setTabBarHeight(e.nativeEvent.layout.height);

  return (
    <Tabs
      screenOptions={{ headerShown: false, animation: 'none' }}
      tabBar={() => (
        <View style={styles.tabBarWrap}>
          <Toast bottomOffset={tabBarHeight + 12} />
          <View onLayout={onTabBarLayout}>
            <TabBar />
          </View>
        </View>
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="categories" />
      <Tabs.Screen name="listing" />
      <Tabs.Screen name="cart" />
      <Tabs.Screen name="account" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="product/[id]" />
      <Tabs.Screen name="stores" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarWrap: { position: 'relative' },
});
