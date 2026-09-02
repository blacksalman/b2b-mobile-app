import React, { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ds, dsFontFamily, dsRadii, dsSpacing, dsType } from '@/theme';
import { ArrowRightIcon, SmallBackChevronIcon } from '@/icons';
import { BrandLogo } from '@/components/shell/BrandLogo';
import { useAppState } from '@/state/AppStateContext';
import { sendOtp, verifyOtp, fetchCurrentCustomer } from '@/lib/medusaAuth';
import { toE164 } from '@/lib/phoneFormat';

// Built against the new AyurvedaOne design system (screen_AuthOtp.html, `isAuthOtp` block — fully in
// range). Second step of the Auth flow.
//
// `authPhoneMasked` is read directly from source (line 3142): `(s.authPhone||'9198208114')
// .replace(/(\d{3})(\d{3})(\d+)/,'$1-$2-$3')` — ported verbatim, including the hardcoded fallback
// number when no phone was entered.
//
// `otpDigits`'s exact map function is truncated past the source's 256KB cap (cuts off mid-statement
// right after `.ma`). The 4-box layout, `d.val`/`d.onChange`/`d.border` shape, and the "no defined
// resend cooldown/timer anywhere in the extracted markup" are read directly; the per-digit
// auto-advance-on-type behavior and the border color rule (filled → primary, empty → line-strong,
// matching this design system's §8.6 focus convention already used by every other input built this
// session) are standard OTP-input UX, not invented business logic or data.
//
// Real backend behind this screen now (src/modules/auth-phone-otp on the backend, live Kaleyra SMS
// + Emovur WhatsApp delivery): the same verify call works for both a returning customer and a brand
// new phone (see medusaAuth.ts's verifyOtp comment for why) - this screen just branches on the
// result. A returning customer's session is already fully usable the moment this succeeds, so it
// logs straight in; a new phone gets a registration token good only for the next step and moves on
// to Register to collect the rest of the profile. The backend's generateOtp (auth-phone-otp/utils.ts)
// produces a 4-digit code, matching this screen's 4 boxes exactly.
export default function AuthOtpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { flash, login } = useAppState();
  const { phone } = useLocalSearchParams<{ phone?: string }>();
  const [otp, setOtp] = useState(['', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  const authPhoneMasked = (phone || '9198208114').replace(/(\d{3})(\d{3})(\d+)/, '$1-$2-$3');

  const goAuthPhone = () => router.push('/auth/phone');
  const onDigitChange = (i: number, v: string) => {
    const d = v.replace(/\D/g, '').slice(-1);
    setOtp((cur) => {
      const next = [...cur];
      next[i] = d;
      return next;
    });
    if (d && i < 3) inputRefs.current[i + 1]?.focus();
  };
  const submitOtp = async () => {
    if (!phone || verifying) return;
    const code = otp.join('');
    if (code.length < 4) return;
    setVerifying(true);
    try {
      const { isNewUser } = await verifyOtp(toE164(phone), code);
      if (isNewUser) {
        router.push({ pathname: '/auth/register', params: { phone } });
        return;
      }
      const customer = await fetchCurrentCustomer();
      if (!customer) {
        flash('Something went wrong - please try again.');
        return;
      }
      login(customer);
      flash(`Welcome back${customer.first_name ? ', ' + customer.first_name : ''}`);
      router.push('/account');
    } catch {
      flash('Incorrect or expired code. Please try again.');
      setOtp(['', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };
  const resendOtp = async () => {
    setOtp(['', '', '', '']);
    inputRefs.current[0]?.focus();
    if (!phone) return;
    try {
      await sendOtp(toE164(phone));
      flash('OTP resent');
    } catch {
      flash('Could not resend the code. Please try again.');
    }
  };

  return (
    // Same fix as auth/phone.tsx: the card is pinned to the bottom of the screen, so the number
    // pad landed straight on top of the code boxes and the Verify button. `padding` on both
    // platforms - Android included, because SDK 54's edge-to-edge window is not resized by the
    // keyboard - and the ScrollView keeps the card reachable when the lift alone isn't enough.
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
          <Pressable onPress={goAuthPhone} style={[styles.backButton, { top: insets.top + 16 }]} hitSlop={4}>
            <SmallBackChevronIcon size={9} color={ds.ink} />
          </Pressable>
          <BrandLogo />
        </View>

        <View style={styles.card}>
          <Text style={dsType.h1}>Enter verification code</Text>
          <Text style={styles.subtitle}>
            Enter the 4-digit code sent to{'\n'}
            <Text style={styles.phoneText}>+91 {authPhoneMasked}</Text>
          </Text>

          <View style={styles.otpRow}>
            {otp.map((d, i) => (
              <TextInput
                key={i}
                ref={(r) => {
                  inputRefs.current[i] = r;
                }}
                value={d}
                onChangeText={(v) => onDigitChange(i, v)}
                maxLength={1}
                keyboardType="number-pad"
                style={[styles.otpBox, { borderColor: d ? ds.primary : ds.lineStrong }]}
                // Delayed past the keyboard's own animation, so the scrollable height is final by
                // the time we scroll. Auto-advance re-fires this per box, which is harmless - the
                // view is already at the end.
                onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150)}
              />
            ))}
          </View>

          <Pressable onPress={submitOtp} disabled={verifying} style={[styles.ctaButton, verifying && styles.ctaButtonDisabled]}>
            {verifying ? (
              <ActivityIndicator color={ds.surface} />
            ) : (
              <>
                <Text style={styles.ctaButtonText}>Verify</Text>
                <ArrowRightIcon size={14} color={ds.surface} strokeWidth={2.2} />
              </>
            )}
          </Pressable>

          <Text style={styles.resendText}>
            Didn&apos;t receive the code? <Text onPress={resendOtp} style={styles.resendLink}>Resend OTP</Text>
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 AyurvedaOne. All Rights Reserved.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: ds.canvas },
  // flexGrow, not flex: keyboard down, the content still fills the screen so the hero's flex:1
  // holds the card at the bottom; keyboard up, it may exceed the space left and scroll.
  scrollContent: { flexGrow: 1 },
  top: {
    flex: 1,
    position: 'relative',
    backgroundColor: ds.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    padding: dsSpacing.lg,
  },
  backButton: {
    position: 'absolute',
    left: dsSpacing.lg,
    width: 32,
    height: 32,
    borderRadius: dsRadii.button,
    backgroundColor: ds.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  card: { flexShrink: 0, backgroundColor: ds.surface, padding: 24, paddingHorizontal: dsSpacing.lg, alignItems: 'center' },
  subtitle: { ...dsType.body, color: ds.ink2, marginTop: dsSpacing.sm, textAlign: 'center' },
  phoneText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 21, color: ds.primaryInk },

  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: dsSpacing.md, marginTop: dsSpacing.lg },
  otpBox: {
    width: 48,
    height: 48,
    textAlign: 'center',
    borderWidth: 1.5,
    borderRadius: dsRadii.input,
    fontFamily: dsFontFamily[700],
    fontSize: 18,
    lineHeight: 24,
    color: ds.ink,
  },

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

  resendText: { fontFamily: dsFontFamily[400], fontSize: 13, lineHeight: 19, color: ds.ink2, marginTop: dsSpacing.md },
  resendLink: { fontFamily: dsFontFamily[600], fontSize: 13, lineHeight: 19, color: ds.primaryInk },

  footer: { flexShrink: 0, backgroundColor: ds.inverse, paddingHorizontal: dsSpacing.lg, paddingTop: dsSpacing.md, paddingBottom: 24, alignItems: 'center' },
  footerText: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: 'rgba(255,255,255,.72)' },
});
