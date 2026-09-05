import { useState } from 'react';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabBar } from '@/components/shell/TabBar';
import { Toast } from '@/components/shell/Toast';
import { MiniCartFab } from '@/components/shell/MiniCartFab';
import { useAppState } from '@/state/AppStateContext';
import { dsSpacing } from '@/theme';

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

// Ported verbatim from `showMiniCartFab` (various-mobile-app-phone.dc.html line ~3110):
// `['home','categories','listing','category','product'].includes(S)` — 'category' has no RN
// equivalent since Category/Brand were merged into Listing in an earlier sync, so it's dropped here.
function isMiniCartScreen(pathname: string): boolean {
  return pathname === '/' || pathname === '/categories' || pathname === '/listing' || pathname.startsWith('/product/');
}

// The Product Detail screen (not its Reviews sub-route) renders its own screen-local sticky
// "Add to Cart" footer (`addBar` in `product/[id].tsx`) above the always-visible TabBar — a fixed
// height of paddingTop(12) + content(48) + paddingBottom(12) + border(1) = 73. The floating
// mini-cart pill below needs to clear that bar too, not just the TabBar, or it renders underneath
// it. No `insets.bottom` in that sum: the bar no longer pads for the home indicator itself, since
// the TabBar beneath it already does.
// The 3-screen Auth flow (Phone -> OTP -> Register) hides the tab bar. This is a deliberate
// departure from source, which kept it visible everywhere (see the note in auth/phone.tsx): these
// screens are a full-screen, self-contained flow with their own close/back affordance, and the tab
// bar both competed with that and ate the space the keyboard needs.
function isAuthScreen(pathname: string): boolean {
  return pathname.startsWith('/auth/');
}

const PRODUCT_ADD_BAR_HEIGHT = 73;
function isProductDetailScreen(pathname: string): boolean {
  return pathname.startsWith('/product/') && !pathname.endsWith('/reviews');
}

export default function TabsLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { cartTotals } = useAppState();
  const [tabBarHeight, setTabBarHeight] = useState(80);
  const [fabHeight, setFabHeight] = useState(0);

  const onTabBarLayout = (e: LayoutChangeEvent) => setTabBarHeight(e.nativeEvent.layout.height);
  const onFabLayout = (e: LayoutChangeEvent) => setFabHeight(e.nativeEvent.layout.height);

  const hideTabBar = isAuthScreen(pathname);
  const showFab = cartTotals.cartHasItems && isMiniCartScreen(pathname);
  const fabBottomOffset = tabBarHeight + (isProductDetailScreen(pathname) ? PRODUCT_ADD_BAR_HEIGHT : 0);
  // With no tab bar to clear, a toast sits on the safe-area inset instead of the (now stale)
  // last-measured bar height - otherwise it floats in mid-air above nothing on the auth screens.
  const toastBottomOffset = hideTabBar
    ? insets.bottom + dsSpacing.md
    : tabBarHeight + (showFab ? fabHeight + 20 : 12);
  const goCart = () => router.push('/cart');

  return (
    <Tabs
      // Without this, every back button in the app lands on Home. A TabRouter defaults to
      // backBehavior 'firstRoute' (@react-navigation/routers SwitchRouter.tsx's own default), which
      // makes GO_BACK jump to routes[0] - `index` below - rather than to wherever you actually came
      // from, so Home -> Categories -> Product -> back went to Home instead of Categories. That hits
      // every screen here, not just Product, since they're all siblings of this one navigator (see
      // the note above on why this is a real <Tabs/> and not a stack), and it hits router.back()
      // call sites and the Android hardware back button alike - both dispatch GO_BACK.
      //
      // 'fullHistory' over plain 'history' because routes here carry params that identify what
      // you were looking at (/categories?categoryId=X, /listing filters, /product/[id]): it records
      // params per history entry and restores them on the way back, where 'history' only restores
      // the route. That also makes back work between two visits to the SAME route with different
      // params - Product A -> a related Product B -> back returns to A, which matters because a
      // product page links out to alternate/same-category/also-bought products, and every one of
      // those is this single `product/[id]` tab route.
      backBehavior="fullHistory"
      screenOptions={{ headerShown: false, animation: 'none' }}
      tabBar={() => (
        <View style={styles.tabBarWrap}>
          <Toast bottomOffset={toastBottomOffset} />
          {showFab && <MiniCartFab bottomOffset={fabBottomOffset} onLayout={onFabLayout} onPress={goCart} />}
          {!hideTabBar && (
            <View onLayout={onTabBarLayout}>
              <TabBar />
            </View>
          )}
        </View>
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="categories" />
      <Tabs.Screen name="listing" />
      <Tabs.Screen name="cart" />
      <Tabs.Screen name="checkout" />
      <Tabs.Screen name="account" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="product/[id]" />
      <Tabs.Screen name="product/[id]/reviews" />
      <Tabs.Screen name="stores" />
      <Tabs.Screen name="tracking" />
      <Tabs.Screen name="addresses" />
      <Tabs.Screen name="edit-profile" />
      <Tabs.Screen name="orders/index" />
      <Tabs.Screen name="orders/[id]" />
      <Tabs.Screen name="order-confirmed" />
      <Tabs.Screen name="auth/phone" />
      <Tabs.Screen name="auth/otp" />
      <Tabs.Screen name="auth/register" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarWrap: { position: 'relative' },
});
