import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ds, dsElevation, dsFontFamily, dsRadii, dsSpacing, dsType } from '@/theme';
import { CheckThinIcon, SmallBackChevronIcon } from '@/icons';
import { useAppState } from '@/state/AppStateContext';
import { accountProfile } from '@/data/account-content';

// Rebuilt against the new AyurvedaOne design system (Various Mobile App - Phone.dc.html, the
// `isEditProfile` block, screen_EditProfile.html — that markup slice sat fully in range, read
// directly). First build — Account's profile-row edit-pencil button previously linked to a
// `StubScreen` placeholder.
//
// Unlike the Addresses round, this screen's DCLogic (`editName`/`editEmail`/`editPhone`,
// `businessTypes`, `saveProfile`) sits PAST the project's 256KB `get_file` cap (the source file is
// confirmed truncated at exactly line 3143, right after `otpDigits` — re-confirmed here, a fresh
// pull reproduces the identical cutoff, so nothing further was fetched). Handled the same way the
// Account round did: ground inferences in adjacent in-range evidence rather than invent freely.
//   - `editName`/`editPhone` seed from `accountProfile` (source-grounded via the Account round's own
//     evidence chain: ORDERS' repeated delivery contact + `saveAddress`'s default form).
//   - `editEmail` seeds empty — no email is attached to `profile` anywhere in-range; the only visible
//     `email` field in the initial state seed (source line 2534: `email:'', password:''`) is the
//     separate login-form field and is itself empty by default, which is the closest evidence for
//     what an unset email should look like here.
//   - `businessTypes` (2 entries, `hint-placeholder-count="2"`) inferred as Pharmacy/Clinic — the only
//     two venue types this app's mock world actually uses, matching `ADDRESS_SEED`'s two labels
//     ("Sunrise Pharmacy", "Wellness Clinic") exactly. Default selection (Pharmacy) is a plain
//     first-item default, not source-derived.
//   - Selected/unselected radio-dot colors mirror the Addresses screen's own selected-address radio
//     (primary border + primaryStrong fill when on, primary border only when off) — that pattern was
//     read directly from in-range source on this same screen family, so reusing it here for an
//     analogous control is grounded, not invented from scratch.
//
// `saveProfile` itself is unreachable past the cap, so its real behavior can't be confirmed. Built as
// "save locally, flash a confirmation, return to Account" — the most faithful guess for a
// single-action save button — but this does NOT write back to Account's displayed name/phone: those
// come from the static `accountProfile` export, and making the two screens share live profile state
// would mean touching `account.tsx`, which is out of scope for an Edit-Profile-only round. Flagged
// here rather than faked.
export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { flash } = useAppState();

  const [editName, setEditName] = useState(accountProfile.name);
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState(accountProfile.phone);
  const [bizType, setBizType] = useState<(typeof BUSINESS_TYPES)[number]>(BUSINESS_TYPES[0]);

  const goAccount = () => router.push('/account');
  const saveProfile = () => {
    flash('Profile updated');
    goAccount();
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={goAccount} style={styles.roundButton} hitSlop={4}>
          <SmallBackChevronIcon size={9} color={ds.ink} />
        </Pressable>
        <Text style={dsType.h2}>Edit Profile</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{accountProfile.initials}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Field label="Full name" value={editName} onChangeText={setEditName} placeholder="Full name" />
          <Field label="Email address" value={editEmail} onChangeText={setEditEmail} placeholder="Email address" style={styles.fieldSpaced} />
          <Field label="Phone number" value={editPhone} onChangeText={setEditPhone} placeholder="Phone number" style={styles.fieldSpaced} keyboardType="phone-pad" />

          <Text style={[styles.fieldLabel, styles.fieldSpaced]}>Business type</Text>
          <View style={styles.bizRow}>
            {BUSINESS_TYPES.map((bt) => {
              const selected = bt === bizType;
              return (
                <Pressable key={bt} onPress={() => setBizType(bt)} style={[styles.bizTile, { borderColor: selected ? ds.primary : ds.line }]}>
                  <View style={[styles.radioDot, selected && styles.radioDotOn]}>
                    {selected && <CheckThinIcon size={10} color={ds.surface} />}
                  </View>
                  <Text style={styles.bizTileText}>{bt}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable onPress={saveProfile} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save changes</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const BUSINESS_TYPES = ['Pharmacy', 'Clinic'] as const;

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
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
}) {
  return (
    <View style={style}>
      <Text style={styles.fieldLabel}>{label}</Text>
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

  avatarRow: { alignItems: 'center' },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: dsRadii.pill,
    backgroundColor: ds.primaryStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: dsFontFamily[700], fontSize: 22, lineHeight: 28, color: ds.surface },

  card: {
    marginTop: dsSpacing.lg,
    backgroundColor: ds.surface,
    borderWidth: 1,
    borderColor: ds.line,
    borderRadius: dsRadii.button,
    padding: dsSpacing.md,
    ...dsElevation.e1,
  },
  fieldLabel: { fontFamily: dsFontFamily[600], fontSize: 13, lineHeight: 18, color: ds.ink2 },
  fieldSpaced: { marginTop: dsSpacing.md },
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

  bizRow: { marginTop: dsSpacing.sm, flexDirection: 'row', gap: dsSpacing.sm },
  bizTile: {
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
  bizTileText: { fontFamily: dsFontFamily[600], fontSize: 13, lineHeight: 18, color: ds.ink },

  saveButton: {
    marginTop: dsSpacing.lg,
    height: 48,
    borderRadius: dsRadii.button,
    backgroundColor: ds.primaryStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.surface },
});
