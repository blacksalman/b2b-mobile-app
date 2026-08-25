import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ds, dsElevation, dsFontFamily, dsRadii, dsSpacing, dsType } from '@/theme';
import { CheckThinIcon, SmallBackChevronIcon } from '@/icons';
import { useAppState } from '@/state/AppStateContext';
import { updateCustomer } from '@/lib/medusaAuth';
import { toE164 } from '@/lib/phoneFormat';

// Rebuilt against the new AyurvedaOne design system (Various Mobile App - Phone.dc.html, the
// `isEditProfile` block, screen_EditProfile.html) - same layout as the original mock build, now
// backed by the real /store/customers/me (native, confirmed live: GET+POST both present, POST
// accepts first_name/last_name/email/phone/metadata) instead of a local-only mock profile that
// never wrote back to Account's own displayed name/phone at all.
//
// Business type has no dedicated real field - it's stored the same place registration
// (auth/register.tsx's completeRegistration) already writes it, customer.metadata.business_type -
// so this screen reads/writes that same key rather than inventing a new one.
export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { flash, customer, login } = useAppState();

  const [editName, setEditName] = useState([customer?.first_name, customer?.last_name].filter(Boolean).join(' '));
  const [editEmail, setEditEmail] = useState(customer?.email ?? '');
  // Local 10-digit part only - the real phone (customer.phone, toE164-formatted, e.g.
  // "+917068039016") always carries the "+91" prefix, same format auth/phone.tsx writes it in
  // and the only format this backend ever stores it in for a real Indian customer.
  const [editPhone, setEditPhone] = useState((customer?.phone ?? '').replace(/^\+91/, ''));
  const onEditPhone = (v: string) => setEditPhone(v.replace(/\D/g, '').slice(0, 10));
  const [bizType, setBizType] = useState<(typeof BUSINESS_TYPES)[number]>(
    (customer?.metadata?.business_type as (typeof BUSINESS_TYPES)[number] | undefined) ?? BUSINESS_TYPES[0]
  );
  const [saving, setSaving] = useState(false);

  const initials = [customer?.first_name?.[0], customer?.last_name?.[0]].filter(Boolean).join('').toUpperCase() || 'A';

  const goAccount = () => router.push('/account');
  const saveProfile = async () => {
    if (saving) return;
    // Same 10-digit Indian mobile pattern auth/phone.tsx enforces before ever sending an OTP -
    // a real Indian mobile number is exactly 10 digits starting 6-9 (landline/other prefixes
    // aren't valid OTP-auth numbers on this backend either).
    if (!/^[6-9]\d{9}$/.test(editPhone)) {
      flash('Enter a valid 10-digit mobile number');
      return;
    }
    setSaving(true);
    const [firstName, ...rest] = editName.trim().split(/\s+/).filter(Boolean);
    try {
      const updated = await updateCustomer({
        first_name: firstName || editName.trim(),
        last_name: rest.join(' ') || null,
        phone: toE164(editPhone),
        metadata: { ...(customer?.metadata ?? {}), business_type: bizType },
      });
      login(updated);
      flash('Profile updated');
      goAccount();
    } catch {
      flash('Could not update your profile');
    } finally {
      setSaving(false);
    }
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
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Field label="Full name" value={editName} onChangeText={setEditName} placeholder="Full name" />
          {/* Read-only: confirmed live and in Medusa's own source that /store/customers/me's
              update validator (StoreUpdateCustomer) has no email field at all, unlike account
              creation - editable here would look like a real field that silently never saves. */}
          <Field label="Email address" value={editEmail} onChangeText={setEditEmail} placeholder="Email address" style={styles.fieldSpaced} keyboardType="email-address" editable={false} />
          <View style={styles.fieldSpaced}>
            <Text style={styles.fieldLabel}>Phone number</Text>
            <View style={styles.phoneBox}>
              <Text style={styles.phonePrefix}>+91</Text>
              <View style={styles.phoneDivider} />
              <TextInput
                value={editPhone}
                onChangeText={onEditPhone}
                placeholder="10-digit mobile number"
                placeholderTextColor={ds.ink3}
                keyboardType="number-pad"
                maxLength={10}
                style={styles.input}
              />
            </View>
          </View>

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

        <Pressable onPress={saveProfile} disabled={saving} style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
          {saving ? <ActivityIndicator color={ds.surface} /> : <Text style={styles.saveButtonText}>Save changes</Text>}
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
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  style?: object;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  editable?: boolean;
}) {
  return (
    <View style={style}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputBox, !editable && styles.inputBoxDisabled]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={ds.ink3}
          keyboardType={keyboardType}
          editable={editable}
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
  inputBoxDisabled: { backgroundColor: ds.canvas },
  input: { flex: 1, ...dsType.body, padding: 0 },
  phoneBox: {
    marginTop: dsSpacing.sm,
    height: 48,
    borderRadius: dsRadii.input,
    borderWidth: 1,
    borderColor: ds.lineStrong,
    backgroundColor: ds.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: dsSpacing.sm,
    paddingHorizontal: dsSpacing.md,
  },
  phonePrefix: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink },
  phoneDivider: { width: 1, height: 20, backgroundColor: ds.line },

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
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.surface },
});
