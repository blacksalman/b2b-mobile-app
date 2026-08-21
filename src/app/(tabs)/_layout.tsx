import { useState } from 'react';
import { Slot } from 'expo-router';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { colors } from '@/theme';
import { TabBar } from '@/components/shell/TabBar';
import { Toast } from '@/components/shell/Toast';

// All 13 source screens are siblings under this one group (see plan's "Tab Bar Must Never Hide" note)
// so the custom TabBar below — rendered here, not owned by a navigator — is always on screen,
// matching the source's tab bar having no showHeader-style guard. `<Slot/>` swaps the active screen
// instantly, mirroring how the source itself swaps `state.screen` with no stack/push animation.
export default function TabsLayout() {
  const [tabBarHeight, setTabBarHeight] = useState(80);

  const onTabBarLayout = (e: LayoutChangeEvent) => setTabBarHeight(e.nativeEvent.layout.height);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Slot />
      </View>
      <Toast bottomOffset={tabBarHeight + 12} />
      <View onLayout={onTabBarLayout}>
        <TabBar />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cardBg },
  content: { flex: 1 },
});
