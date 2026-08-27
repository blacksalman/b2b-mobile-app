import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ds, dsElevation, dsFontFamily, dsRadii, dsSpacing, dsType } from '@/theme';
import {
  ChevronRightIcon,
  ContactIcon,
  EditPencilIcon,
  InfoCircleIcon,
  LocationPinIcon,
  LogoutIcon,
  OrdersIcon,
  PersonCircleIcon,
  SmallBackChevronIcon,
} from '@/icons';
import { useAppState } from '@/state/AppStateContext';
import { usePolicies, policyRows, addressCountLabel, type PolicyEntry } from '@/data/account-content';
import { fetchAddresses } from '@/lib/medusaAddresses';
import { PolicySheet } from '@/components/shell/PolicySheet';

// Rebuilt against the new AyurvedaOne design system (Various Mobile App - Phone.dc.html, the
// `isAccount` block, screen_Account.html). This is a first build, not a migration — the old
// `account.tsx` was never more than a `StubScreen` placeholder in any prior round of this project.
//
// `login` navigates into the 3-screen Auth flow (`/auth/phone` → `/auth/otp` → `/auth/register`,
// built in a later round) — the flow's own `completeRegistration` step is what actually sets
// `loggedIn` via the shared `AppStateContext` setter, not this screen. `logout` still flips
// `loggedIn` directly, matching source's own symmetric `login`/`logout` pair (only `login` needed a
// real multi-screen flow; a plain sign-out has no equivalent flow to build). `goOrders`/`goAddresses`/
// `goEditProfile` route to lightweight stub screens built in this same original round, later replaced
// with real screens in follow-up rounds.
//
// `profile`/`policyRows`/`addressCountLabel`/`logout`/`goEditProfile`'s exact DCLogic definitions sit
// past this project's 256KB `get_file` cap (the source object literal is confirmed truncated mid-field,
// right after `otpDigits`) — see `account-content.ts` for exactly what's grounded in in-range source
// data (POLICIES, ORDERS' repeated contact) vs. a flagged placeholder (address count).
export default function AccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { loggedIn, customer, logoutUser } = useAppState();
  const { policies } = usePolicies();
  const [policyKey, setPolicyKey] = useState<string | null>(null);
  const [addressCount, setAddressCount] = useState(0);

  // Re-fetches every time Account regains focus, not just on first mount - Account is a
  // persistent tab screen (never remounted), so a mount-only fetch kept showing whatever the
  // address count was the first time this screen ever opened, even after adding/deleting one on
  // the Addresses screen and coming back (confirmed live: "2 saved addresses" shown after
  // deleting down to 1).
  useFocusEffect(
    useCallback(() => {
      if (!loggedIn) return;
      let cancelled = false;
      fetchAddresses()
        .then((addresses) => {
          if (!cancelled) setAddressCount(addresses.length);
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }, [loggedIn])
  );

  const fullName = [customer?.first_name, customer?.last_name].filter(Boolean).join(' ') || 'Your account';
  const initials =
    [customer?.first_name?.[0], customer?.last_name?.[0]].filter(Boolean).join('').toUpperCase() || 'A';

  const goHome = () => router.push('/');
  const goOrders = () => router.push('/orders');
  const goAddresses = () => router.push('/addresses');
  const goEditProfile = () => router.push('/edit-profile');
  const login = () => router.push('/auth/phone');
  const logout = () => logoutUser();
  const openPolicy = (key: string) => setPolicyKey(key);
  const closePolicy = () => setPolicyKey(null);

  const policy = policyKey ? policies.find((p) => p.key === policyKey) ?? null : null;

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={goHome} style={styles.roundButton} hitSlop={4}>
          <SmallBackChevronIcon size={9} color={ds.ink} />
        </Pressable>
        <Text style={dsType.h2}>My Account</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {!loggedIn ? (
          <>
            <View style={styles.loginCard}>
              <View style={styles.loginIcon}>
                <PersonCircleIcon size={26} color={ds.primaryInk} />
              </View>
              <Text style={styles.loginTitle}>Log in to continue</Text>
              <Text style={styles.loginBody}>
                Sign in to your trade account to view past orders, reorder frequently bought medicines, and unlock your contract pricing.
              </Text>
              <Pressable onPress={login} style={styles.loginButton}>
                <Text style={styles.loginButtonText}>Log in</Text>
              </Pressable>
            </View>

            <PolicyGroup title="Policies" rows={policyRows(policies)} onOpen={openPolicy} />
            <AboutGroup onOpenAbout={() => openPolicy('about')} onOpenContact={() => openPolicy('contact')} />
            <Footer />
          </>
        ) : (
          <>
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{fullName}</Text>
                <Text style={styles.profilePhone}>{customer?.phone ?? ''}</Text>
              </View>
              <Pressable onPress={goEditProfile} style={styles.roundButton} hitSlop={4}>
                <EditPencilIcon size={16} color={ds.primaryInk} />
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>Account Menu</Text>
            <View style={styles.menuGrid}>
              <Pressable onPress={goOrders} style={styles.menuTile}>
                <View style={styles.menuIcon}>
                  <OrdersIcon size={17} color={ds.primaryInk} />
                </View>
                <Text style={styles.menuTileTitle}>My Orders</Text>
                <Text style={styles.menuTileSubtitle}>Track & reorder</Text>
              </Pressable>
              <Pressable onPress={goAddresses} style={styles.menuTile}>
                <View style={styles.menuIcon}>
                  <LocationPinIcon size={17} color={ds.primaryInk} strokeWidth={1.6} />
                </View>
                <Text style={styles.menuTileTitle}>My Addresses</Text>
                <Text style={styles.menuTileSubtitle}>{addressCountLabel(addressCount)}</Text>
              </Pressable>
            </View>

            <PolicyGroup title="Policies" rows={policyRows(policies)} onOpen={openPolicy} />
            <AboutGroup onOpenAbout={() => openPolicy('about')} onOpenContact={() => openPolicy('contact')} />

            <Pressable onPress={logout} style={styles.logoutButton}>
              <LogoutIcon size={15} color={ds.dangerInk} />
              <Text style={styles.logoutButtonText}>Sign Out</Text>
            </Pressable>
            <Footer />
          </>
        )}
      </ScrollView>

      <PolicySheet policy={policy} onClose={closePolicy} />
    </View>
  );
}

const PolicyGroup = React.memo(function PolicyGroup({ title, rows, onOpen }: { title: string; rows: PolicyEntry[]; onOpen: (key: string) => void }) {
  if (!rows.length) return null;
  return (
    <>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.rowsCard}>
        {rows.map((row, i) => (
          <Pressable
            key={row.key}
            onPress={() => onOpen(row.key)}
            style={[styles.row, i === rows.length - 1 && styles.rowLast]}
          >
            <View style={styles.rowIcon}>
              <InfoCircleIcon size={17} color={ds.primaryInk} />
            </View>
            <Text style={styles.rowText}>{row.title}</Text>
            <ChevronRightIcon size={8} color={ds.ink2} strokeWidth={2} />
          </Pressable>
        ))}
      </View>
    </>
  );
});

const AboutGroup = React.memo(function AboutGroup({ onOpenAbout, onOpenContact }: { onOpenAbout: () => void; onOpenContact: () => void }) {
  return (
    <>
      <Text style={styles.sectionTitle}>About</Text>
      <View style={styles.rowsCard}>
        <Pressable onPress={onOpenAbout} style={styles.row}>
          <View style={styles.rowIcon}>
            <InfoCircleIcon size={17} color={ds.primaryInk} />
          </View>
          <Text style={styles.rowText}>About Us</Text>
          <ChevronRightIcon size={8} color={ds.ink2} strokeWidth={2} />
        </Pressable>
        <Pressable onPress={onOpenContact} style={[styles.row, styles.rowLast]}>
          <View style={styles.rowIcon}>
            <ContactIcon size={17} color={ds.primaryInk} />
          </View>
          <Text style={styles.rowText}>Contact Us</Text>
          <ChevronRightIcon size={8} color={ds.ink2} strokeWidth={2} />
        </Pressable>
      </View>
    </>
  );
});

const Footer = React.memo(function Footer() {
  return (
    <>
      <Text style={styles.footerText}>Version 1.0.0</Text>
      <Text style={[styles.footerText, styles.footerTextTight]}>© 2026 AyurvedaOne. All Rights Reserved.</Text>
    </>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ds.canvas },
  topBar: {
    flexShrink: 0,
    backgroundColor: ds.surface,
    borderBottomWidth: 1,
    borderBottomColor: ds.line,
    paddingHorizontal: dsSpacing.lg,
    paddingBottom: dsSpacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: dsSpacing.md,
  },
  roundButton: {
    flexShrink: 0,
    width: 32,
    height: 32,
    borderRadius: dsRadii.button,
    backgroundColor: ds.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  bodyContent: { padding: dsSpacing.lg, paddingBottom: dsSpacing.xl },

  loginCard: {
    backgroundColor: ds.surface,
    borderWidth: 1,
    borderColor: ds.line,
    borderRadius: dsRadii.button,
    padding: 24,
    paddingHorizontal: dsSpacing.lg,
    alignItems: 'center',
    ...dsElevation.e1,
  },
  loginIcon: {
    width: 56,
    height: 56,
    borderRadius: dsRadii.pill,
    backgroundColor: ds.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginTitle: { ...dsType.h2, marginTop: dsSpacing.md },
  loginBody: { ...dsType.body, color: ds.ink2, marginTop: dsSpacing.sm, textAlign: 'center' },
  loginButton: {
    marginTop: dsSpacing.md,
    alignSelf: 'stretch',
    height: 48,
    borderRadius: dsRadii.button,
    backgroundColor: ds.primaryStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: { ...dsType.title, color: ds.surface },

  profileCard: {
    backgroundColor: ds.surface,
    borderWidth: 1,
    borderColor: ds.line,
    borderRadius: dsRadii.button,
    padding: dsSpacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: dsSpacing.md,
    ...dsElevation.e1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: dsRadii.pill,
    backgroundColor: ds.primaryStrong,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontFamily: dsFontFamily[700], fontSize: 18, lineHeight: 24, color: ds.surface },
  profileInfo: { flex: 1, minWidth: 0 },
  profileName: { fontFamily: dsFontFamily[700], fontSize: 16, lineHeight: 22, letterSpacing: -0.16, color: ds.ink },
  profilePhone: { ...dsType.meta, marginTop: 4 },

  sectionTitle: { ...dsType.h3, marginTop: dsSpacing.xl },
  menuGrid: { marginTop: 16, flexDirection: 'row', gap: dsSpacing.md },
  menuTile: {
    flex: 1,
    backgroundColor: ds.surface,
    borderWidth: 1,
    borderColor: ds.line,
    borderRadius: dsRadii.button,
    padding: dsSpacing.lg,
    ...dsElevation.e1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: dsRadii.pill,
    backgroundColor: ds.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTileTitle: { ...dsType.title, marginTop: dsSpacing.md },
  menuTileSubtitle: { ...dsType.meta, marginTop: 4 },

  rowsCard: {
    marginTop: 16,
    backgroundColor: ds.surface,
    borderWidth: 1,
    borderColor: ds.line,
    borderRadius: dsRadii.button,
    overflow: 'hidden',
    ...dsElevation.e1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dsSpacing.md,
    padding: dsSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ds.line,
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: dsRadii.pill,
    backgroundColor: ds.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { ...dsType.title, flex: 1 },

  logoutButton: {
    marginTop: dsSpacing.xl,
    height: 48,
    borderRadius: dsRadii.button,
    borderWidth: 1.5,
    borderColor: ds.dangerInk,
    backgroundColor: ds.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: dsSpacing.sm,
  },
  logoutButtonText: { ...dsType.title, color: ds.dangerInk },

  footerText: { ...dsType.meta, textAlign: 'center', marginTop: dsSpacing.lg },
  footerTextTight: { marginTop: 0 },
});
