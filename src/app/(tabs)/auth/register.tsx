import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ds, dsElevation, dsFontFamily, dsRadii, dsSpacing, dsType } from '@/theme';
import { ArrowRightIcon, CheckThinIcon, SmallBackChevronIcon } from '@/icons';
import { useAppState } from '@/state/AppStateContext';

// Built against the new AyurvedaOne design system (screen_AuthRegister.html, `isAuthRegister` block —
// fully in range). Final step of the Auth flow: on completion this is the ONE place in the app that
// actually sets `loggedIn` to true via the existing `AppStateContext` setter (every other screen's
// "Log in for price" button still just routes to `/account`, matching source's `goAccount` handlers
// verbatim — none of them were changed to jump straight into this flow).
//
// `regTypes`'s exact option list sits past the source's 256KB truncation cap (same cutoff as every
// other round this session hit). Inferred as ['Doctor', 'Retailer/Distributor'] directly from the
// question text itself ("Are you a doctor or retailer/distributor?") — the same grounding technique
// the Edit Profile round used for its own two-option business-type picker, which this screen's radio
// styling is deliberately modeled on (primary border + primaryStrong fill + white check when selected).
//
// `onRegName`/`onRegBusiness`/`onRegEmail`/`completeRegistration` are also past the cap; the two
// setters are the same plain `e=>this.setState({field:e.target.value})` shape as `onAuthPhone` (which
// IS in range), so mirroring that pattern here is mechanical, not invented. `completeRegistration`'s
// destination (back to Account, now logged in) is the only sensible conclusion given every other
// completion handler built this session returns to a sensible endpoint the same way.
export default function AuthRegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { flash, setLoggedIn } = useAppState();

  const [regName, setRegName] = useState('');
  const [regBusiness, setRegBusiness] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regType, setRegType] = useState<(typeof REG_TYPES)[number]>(REG_TYPES[0]);

  const goAuthPhone = () => router.push('/auth/phone');
  const openPolicyTerms = () => flash('Terms of Service');
  const openPolicyPrivacy = () => flash('Privacy Policy');
  const completeRegistration = () => {
    setLoggedIn(true);
    flash('Welcome to AyurvedaOne');
    router.push('/account');
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={[styles.headerRow, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={goAuthPhone} style={styles.roundButton} hitSlop={4}>
            <SmallBackChevronIcon size={9} color={ds.ink} />
          </Pressable>
          <Text style={dsType.h2} numberOfLines={1}>Complete Registration</Text>
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <Text style={styles.intro}>Please provide your details to complete the setup.</Text>

        <View style={styles.card}>
          <Field label="Full name" value={regName} onChangeText={setRegName} placeholder="Enter your full name" />
          <Field label="Business name" value={regBusiness} onChangeText={setRegBusiness} placeholder="Enter your business name" style={styles.fieldSpaced} />
          <Field label="Email address" value={regEmail} onChangeText={setRegEmail} placeholder="Enter your email address" style={styles.fieldSpaced} keyboardType="email-address" />

          <Text style={[dsType.label, styles.fieldSpaced]}>Are you a doctor or retailer/distributor?</Text>
          <View style={styles.typeRow}>
            {REG_TYPES.map((rt) => {
              const selected = rt === regType;
              return (
                <Pressable key={rt} onPress={() => setRegType(rt)} style={[styles.typeTile, { borderColor: selected ? ds.primary : ds.line }]}>
                  <View style={[styles.radioDot, selected && styles.radioDotOn]}>
                    {selected && <CheckThinIcon size={10} color={ds.surface} />}
                  </View>
                  <Text style={styles.typeTileText}>{rt}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={completeRegistration} style={styles.ctaButton}>
            <Text style={styles.ctaButtonText}>Complete registration</Text>
            <ArrowRightIcon size={14} color={ds.surface} strokeWidth={2.2} />
          </Pressable>
          <Text style={styles.legalText}>
            By registering, you agree to our <Text onPress={openPolicyTerms} style={styles.legalLink}>Terms of Service</Text> and{' '}
            <Text onPress={openPolicyPrivacy} style={styles.legalLink}>Privacy Policy</Text>
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const REG_TYPES = ['Doctor', 'Retailer/Distributor'] as const;

const Field = React.memo(function Field({
  label,
  value,
  onChangeText,
  placeholder,
  style,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  style?: object;
  keyboardType?: 'default' | 'email-address';
}) {
  return (
    <View style={style}>
      <Text style={dsType.label}>{label}</Text>
      <View style={styles.inputBox}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={ds.ink3}
          keyboardType={keyboardType}
          style={styles.input}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ds.canvas },
  header: { flexShrink: 0, backgroundColor: ds.surface, borderBottomWidth: 1, borderBottomColor: ds.line },
  headerRow: { paddingHorizontal: dsSpacing.lg, paddingBottom: dsSpacing.lg, flexDirection: 'row', alignItems: 'center', gap: dsSpacing.md },
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
  intro: { ...dsType.body, color: ds.ink2, marginBottom: dsSpacing.lg },

  // Off-scale 16px padding/margins, literal from source — same recurring quirk flagged in the
  // Checkout round's report (a spacing value off the stated 4/8/12/20/32 scale).
  card: { backgroundColor: ds.surface, borderWidth: 1, borderColor: ds.line, borderRadius: dsRadii.button, padding: 16, ...dsElevation.e1 },
  fieldSpaced: { marginTop: 16 },
  inputBox: {
    marginTop: dsSpacing.sm,
    height: 48,
    borderRadius: dsRadii.input,
    borderWidth: 1,
    borderColor: ds.lineStrong,
    backgroundColor: ds.surface,
    justifyContent: 'center',
    paddingHorizontal: dsSpacing.md,
  },
  input: { ...dsType.body, padding: 0 },

  typeRow: { flexDirection: 'row', gap: dsSpacing.sm, marginTop: dsSpacing.sm },
  typeTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: dsSpacing.sm,
    backgroundColor: ds.surface,
    borderWidth: 1.6,
    borderRadius: dsRadii.input,
    padding: dsSpacing.md,
  },
  radioDot: {
    width: 20,
    height: 20,
    borderRadius: dsRadii.pill,
    borderWidth: 1.8,
    borderColor: ds.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDotOn: { backgroundColor: ds.primaryStrong },
  typeTileText: { fontFamily: dsFontFamily[600], fontSize: 13, lineHeight: 18, color: ds.ink },

  // Literal 10px radius from source markup, not dsRadii.button (12) — the same §5-vs-§8.1
  // discrepancy already flagged in the Checkout round's report.
  ctaButton: {
    marginTop: dsSpacing.lg,
    height: 48,
    borderRadius: 10,
    backgroundColor: ds.primaryStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: dsSpacing.sm,
  },
  ctaButtonText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.surface },
  legalText: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink3, marginTop: dsSpacing.md, textAlign: 'center' },
  legalLink: { color: ds.primaryInk },
});
