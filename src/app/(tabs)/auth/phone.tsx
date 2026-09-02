import React, { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ds, dsFontFamily, dsRadii, dsSpacing, dsType } from '@/theme';
import { ArrowRightIcon, CloseIcon } from '@/icons';
import { BrandLogo } from '@/components/shell/BrandLogo';
import { PolicySheet } from '@/components/shell/PolicySheet';
import { useAppState } from '@/state/AppStateContext';
import { usePolicies } from '@/data/account-content';
import { sendOtp } from '@/lib/medusaAuth';
import { toE164 } from '@/lib/phoneFormat';

// Built against the new AyurvedaOne design system (Various Mobile App - Phone.dc.html, the
// `isAuthPhone` block, screen_AuthPhone.html — fully in range, read directly). First of the 3-screen
// Auth flow (Phone → OTP → Register), reached from Account's "Log in" button, which previously faked
// the login by directly flipping `loggedIn` — now it navigates here instead.
//
// This screen's own logic (`onAuthPhone`, `sendOtp`, `goAccount`) sat fully in range of the 256KB
// `get_file` cap. `sendOtp` just transitions screens with a cleared OTP array in the source — no real
// phone validation exists (mock prototype), replicated as-is: any 1-10 digit input is accepted.
//
// Per source's own `notProduct:S!=='product'` (line 2733), the tab bar is NOT hidden for this screen
// (it excludes only the Product screen, nothing else) — contrary to what a plausible-but-wrong
// assumption might suggest for a "full-screen auth flow". Verified directly, not guessed: the tab bar
// stays visible here exactly as it does on every other non-Product screen, matching source.
export default function AuthPhoneScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { flash } = useAppState();
  const [authPhone, setAuthPhone] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const { policies } = usePolicies();
  const [policyKey, setPolicyKey] = useState<string | null>(null);
  const policy = policyKey ? policies.find((p) => p.key === policyKey) ?? null : null;

  const goAccount = () => router.push('/account');
  const onAuthPhone = (v: string) => setAuthPhone(v.replace(/\D/g, '').slice(0, 10));
  const submitPhone = async () => {
    if (sending) return;
    // Same real Indian-mobile pattern edit-profile.tsx already enforces (must start 6-9, not
    // just "any 10 digits") - previously this screen only checked length, so an invalid number
    // like "0123456789" would reach the OTP-send API with no client-side rejection at all.
    if (!/^[6-9]\d{9}$/.test(authPhone)) {
      flash('Enter a valid 10-digit mobile number');
      return;
    }
    setSending(true);
    try {
      await sendOtp(toE164(authPhone));
      router.push({ pathname: '/auth/otp', params: { phone: authPhone } });
    } catch {
      flash('Could not send the code. Please try again.');
    } finally {
      setSending(false);
    }
  };
  // Previously just fired a toast with the label text instead of actually opening anything (same
  // bug PolicySheet's own comment describes for checkout.tsx's Return/Shipping rows, fixed there
  // already but missed here) - real admin-configured content now, same pattern as
  // account.tsx/checkout.tsx/product/[id].tsx. A key with no configured policy yet is a safe
  // no-op (PolicySheet stays closed for a null policy), not a crash.
  const openContact = () => setPolicyKey('contact');
  const openPolicyTerms = () => setPolicyKey('terms');
  const openPolicyPrivacy = () => setPolicyKey('privacy');
  const closePolicy = () => setPolicyKey(null);

  return (
    // The form card sits at the bottom of the screen, so the number pad covered it outright - you
    // couldn't see the field you were typing into, let alone the Send button. `padding` lifts the
    // whole column by the keyboard's height, and the hero above (flex:1) absorbs the shrink.
    //
    // "padding" on Android too, deliberately: the usual advice is to leave Android to adjustResize
    // shrinking the window by itself, but SDK 54 draws edge-to-edge, where the window is NOT
    // resized and the keyboard simply overlays the content - so without this Android did nothing.
    <KeyboardAvoidingView style={styles.outer} behavior="padding">
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.top}>
          <Pressable onPress={goAccount} style={[styles.closeButton, { top: insets.top + 16 }]} hitSlop={4}>
            <CloseIcon size={14} color={ds.ink} strokeWidth={2.2} />
          </Pressable>
          <BrandLogo />
        </View>

        <View style={styles.card}>
          <Text style={dsType.h1}>Login to continue</Text>
          <Text style={styles.subtitle}>Access orders, saved addresses, and quick reordering in one smooth flow.</Text>

          <View style={styles.fieldBlock}>
            <Text style={dsType.label}>Mobile number</Text>
            <View style={styles.phoneBox}>
              <Text style={styles.prefix}>+91</Text>
              <View style={styles.divider} />
              <TextInput
                value={authPhone}
                onChangeText={onAuthPhone}
                placeholder="Enter your mobile number"
                placeholderTextColor={ds.ink3}
                maxLength={10}
                keyboardType="number-pad"
                style={styles.input}
                // Belt and braces with the lift above: on a short screen the card can still be
                // taller than the space the keyboard leaves it, and scrolling to the end brings the
                // field and the CTA below it into view. Delayed because the keyboard is still
                // animating on focus, so the scrollable height isn't final yet.
                onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150)}
              />
            </View>
          </View>

          <Pressable onPress={submitPhone} disabled={sending} style={[styles.ctaButton, sending && styles.ctaButtonDisabled]}>
            {sending ? (
              <ActivityIndicator color={ds.surface} />
            ) : (
              <>
                <Text style={styles.ctaButtonText}>Send verification code</Text>
                <ArrowRightIcon size={14} color={ds.surface} strokeWidth={2.2} />
              </>
            )}
          </Pressable>

          <Text style={styles.troubleText}>
            Having trouble? <Text onPress={openContact} style={styles.troubleLink}>Contact Us</Text>
          </Text>
          <Text style={styles.legalText}>
            By continuing, you agree to our <Text onPress={openPolicyTerms} style={styles.legalLink}>Terms and Conditions</Text> &{' '}
            <Text onPress={openPolicyPrivacy} style={styles.legalLink}>Privacy Policy</Text>
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 AyurvedaOne. All Rights Reserved.</Text>
        </View>
      </ScrollView>
      <PolicySheet policy={policy} onClose={closePolicy} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: ds.canvas },
  // flexGrow, not flex: with the keyboard down the content must still fill the screen so the
  // hero's flex:1 pushes the card to the bottom; with it up the content is free to exceed the
  // remaining height and scroll.
  scrollContent: { flexGrow: 1 },
  top: {
    flex: 1,
    position: 'relative',
    backgroundColor: ds.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    padding: dsSpacing.lg,
  },
  closeButton: {
    position: 'absolute',
    left: dsSpacing.lg,
    width: 32,
    height: 32,
    borderRadius: dsRadii.button,
    backgroundColor: ds.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Off-scale 24px padding, literal from source — same recurring quirk noted in the Checkout round's
  // report (a spacing value 16px off the stated 4/8/12/20/32 scale). Preserved, not normalized.
  card: { flexShrink: 0, backgroundColor: ds.surface, padding: 24, paddingHorizontal: dsSpacing.lg, alignItems: 'center' },
  subtitle: { ...dsType.body, color: ds.ink2, marginTop: dsSpacing.sm, textAlign: 'center' },
  fieldBlock: { marginTop: dsSpacing.lg, alignSelf: 'stretch' },
  phoneBox: {
    marginTop: dsSpacing.sm,
    backgroundColor: ds.surface,
    borderWidth: 1,
    borderColor: ds.lineStrong,
    borderRadius: dsRadii.input,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: dsSpacing.md,
    gap: dsSpacing.sm,
  },
  prefix: { ...dsType.title, color: ds.ink },
  divider: { width: 1, height: 20, backgroundColor: ds.line },
  input: { flex: 1, ...dsType.body, padding: 0 },

  // Buttons here use the literal 10px radius from source markup, not dsRadii.button (12) — the same
  // §5-vs-§8.1 discrepancy already flagged in the Checkout round's report.
  ctaButton: {
    marginTop: dsSpacing.lg,
    alignSelf: 'stretch',
    height: 48,
    borderRadius: 10,
    backgroundColor: ds.primaryStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: dsSpacing.sm,
  },
  ctaButtonDisabled: { opacity: 0.7 },
  ctaButtonText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.surface },

  troubleText: { fontFamily: dsFontFamily[400], fontSize: 13, lineHeight: 19, color: ds.ink2, marginTop: dsSpacing.md },
  troubleLink: { fontFamily: dsFontFamily[600], fontSize: 13, lineHeight: 19, color: ds.primaryInk },
  legalText: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink3, marginTop: dsSpacing.md },
  legalLink: { color: ds.primaryInk },

  footer: { flexShrink: 0, backgroundColor: ds.inverse, paddingHorizontal: dsSpacing.lg, paddingTop: dsSpacing.md, paddingBottom: 24, alignItems: 'center' },
  footerText: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: 'rgba(255,255,255,.72)' },
});
