import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ds, dsFontFamily, dsRadii, dsSpacing, dsType } from '@/theme';
import { AddressRemoveIcon, CloseIcon, EditPencilIcon, LocationPinIcon, PlusIcon, SmallBackChevronIcon } from '@/icons';
import { useAppState } from '@/state/AppStateContext';
import { fetchAddresses, createAddress, updateAddress, deleteAddress, type MedusaAddress, type AddressInput } from '@/lib/medusaAddresses';

type SheetMode = 'add' | 'edit';

interface DraftFields {
  name: string;
  phone: string;
  biz: string;
  line: string;
  landmark: string;
  pincode: string;
  city: string;
  state: string;
}

const EMPTY_DRAFT: DraftFields = { name: '', phone: '', biz: '', line: '', landmark: '', pincode: '', city: '', state: '' };

// Rebuilt against the new AyurvedaOne design system (Various Mobile App - Phone.dc.html, the
// `isAddresses` block, screen_Addresses.html) — same card/sheet layout as the original mock build,
// now backed by the real /store/customers/me/addresses CRUD (docs/STORE_API.md section 8) instead
// of a local seeded list. Field mapping: the sheet's single "Receiver Name" field splits into
// Medusa's first_name/last_name on save (same split used by auth/register.tsx); "biz"
// (Clinic/Pharmacy Name) maps to `company`; "line"/"landmark" map to `address_1`/`address_2`;
// "pincode"/"city"/"state" map to `postal_code`/`city`/`province`. "Select this address" now
// really means `is_default_shipping` - Checkout reads that flag to pick which saved address
// pre-fills the order.
//
// Source quirks preserved: the back button routes to Account specifically (`goAccount`), not a
// generic back; `remove` deletes immediately with no confirmation; there's no defined empty state
// for a fully-emptied list; City/State fields render on a `canvas` background while every other
// field is `surface` (visual-only distinction, not disabled inputs). The old mock-only quirk of
// pre-filling Add mode with a hardcoded seed contact is dropped - a real Add form starts blank.
export default function AddressesScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const insets = useSafeAreaInsets();
  const { flash } = useAppState();

  const [addresses, setAddresses] = useState<MedusaAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mode, setMode] = useState<SheetMode>('add');
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftFields>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    fetchAddresses()
      .then(setAddresses)
      .catch(() => flash('Could not load your addresses'))
      .finally(() => setLoading(false));
  }, [flash]);

  useEffect(reload, [reload]);

  // Defaults to Account (its original only entry point) - Checkout's "Change" link opens this
  // screen with ?from=checkout so this returns there instead, rather than always dumping the
  // shopper back on Account mid-checkout.
  const goAccount = () => router.push(from === 'checkout' ? '/checkout' : '/account');

  const openAdd = () => {
    setMode('add');
    setEditId(null);
    setDraft(EMPTY_DRAFT);
    setSheetOpen(true);
  };
  const openEdit = (a: MedusaAddress) => {
    setMode('edit');
    setEditId(a.id);
    setDraft({
      name: [a.first_name, a.last_name].filter(Boolean).join(' '),
      phone: a.phone ?? '',
      biz: a.company ?? '',
      line: a.address_1,
      landmark: a.address_2 ?? '',
      pincode: a.postal_code,
      city: a.city,
      state: a.province ?? '',
    });
    setSheetOpen(true);
  };
  const closeSheet = () => setSheetOpen(false);
  const removeAddress = async (id: string) => {
    setAddresses((list) => list.filter((a) => a.id !== id));
    try {
      await deleteAddress(id);
    } catch {
      flash('Could not remove that address');
      reload();
    }
  };
  const selectAddress = async (id: string) => {
    const target = addresses.find((a) => a.id === id);
    if (!target) return;
    setAddresses((list) => list.map((a) => ({ ...a, is_default_shipping: a.id === id })));
    try {
      await updateAddress(id, {
        first_name: target.first_name ?? '',
        last_name: target.last_name ?? undefined,
        company: target.company ?? undefined,
        address_1: target.address_1,
        address_2: target.address_2 ?? undefined,
        city: target.city,
        province: target.province ?? undefined,
        postal_code: target.postal_code,
        phone: target.phone ?? undefined,
        is_default_shipping: true,
      });
    } catch {
      flash('Could not update your default address');
      reload();
    }
  };

  const setField = <K extends keyof DraftFields>(key: K, value: string) => setDraft((d) => ({ ...d, [key]: value }));

  const saveAddress = async () => {
    if (saving) return;
    setSaving(true);
    const [firstName, ...rest] = draft.name.trim().split(/\s+/).filter(Boolean);
    // A brand new first-ever address becomes the default automatically; editing an existing one
    // keeps whatever its default-shipping status already was, rather than silently demoting it.
    const editingTarget = mode === 'edit' && editId ? addresses.find((a) => a.id === editId) : undefined;
    const isDefaultShipping = mode === 'edit' ? (editingTarget?.is_default_shipping ?? false) : addresses.length === 0;
    const input: AddressInput = {
      first_name: firstName || draft.name.trim(),
      last_name: rest.join(' ') || undefined,
      company: draft.biz.trim() || undefined,
      address_1: draft.line.trim(),
      address_2: draft.landmark.trim() || undefined,
      city: draft.city.trim(),
      province: draft.state.trim() || undefined,
      postal_code: draft.pincode.trim(),
      phone: draft.phone.trim() || undefined,
      is_default_shipping: isDefaultShipping,
    };
    try {
      if (mode === 'edit' && editId) {
        await updateAddress(editId, input);
      } else {
        await createAddress(input);
      }
      setSheetOpen(false);
      flash(mode === 'edit' ? 'Address updated' : 'Address added');
      reload();
    } catch {
      flash('Could not save that address');
    } finally {
      setSaving(false);
    }
  };

  const sheetTitle = mode === 'edit' ? 'Edit Address' : 'Add New Address';
  const sheetCta = mode === 'edit' ? 'Update Address' : 'Save Address';

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <View style={styles.topBarLeft}>
          <Pressable onPress={goAccount} style={styles.roundButton} hitSlop={4}>
            <SmallBackChevronIcon size={9} color={ds.ink} />
          </Pressable>
          <Text style={dsType.h2} numberOfLines={1}>Address Book</Text>
        </View>
        <Pressable onPress={openAdd} style={styles.addButton} hitSlop={4}>
          <PlusIcon size={15} color={ds.primaryInk} />
          <Text style={styles.addButtonText}>Add Address</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {loading && (
          <View style={styles.loadingState}>
            <ActivityIndicator color={ds.primaryInk} />
          </View>
        )}
        {!loading && addresses.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No saved addresses yet</Text>
            <Text style={styles.emptyBody}>Add one to speed up checkout.</Text>
          </View>
        )}
        {addresses.map((a) => {
          const selected = a.is_default_shipping;
          const name = [a.first_name, a.last_name].filter(Boolean).join(' ');
          return (
            <View key={a.id} style={[styles.card, { borderColor: selected ? ds.primary : ds.line }]}>
              <View style={styles.cardTop}>
                <View style={styles.cardTitleRow}>
                  <View style={styles.pinCircle}>
                    <LocationPinIcon size={15} color={ds.primaryInk} strokeWidth={1.7} />
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={1}>{a.company ? `${a.company} - ` : ''}{name}</Text>
                </View>
                <View style={styles.cardActions}>
                  <Pressable onPress={() => openEdit(a)} style={styles.iconButton} hitSlop={4}>
                    <EditPencilIcon size={14} color={ds.primaryInk} />
                  </Pressable>
                  <Pressable onPress={() => removeAddress(a.id)} style={[styles.iconButton, styles.iconButtonDanger]} hitSlop={4}>
                    <AddressRemoveIcon size={14} color={ds.dangerInk} />
                  </Pressable>
                </View>
              </View>
              <Text style={styles.cardBody}>
                {a.address_1}{'\n'}{a.city}, {a.province} {a.postal_code}{'\n'}Phone: {a.phone}
              </Text>
              <View style={styles.divider} />
              <View style={styles.selectRow}>
                {selected ? (
                  <View style={styles.selectedTag}>
                    <View style={styles.radioOn}>
                      <View style={styles.radioOnDot} />
                    </View>
                    <Text style={styles.selectedText}>Your order will deliver here</Text>
                  </View>
                ) : (
                  <Pressable onPress={() => selectAddress(a.id)} style={styles.selectedTag}>
                    <View style={styles.radioOff} />
                    <Text style={styles.selectedText}>Select this address</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={closeSheet}>
        <Pressable style={styles.overlay} onPress={closeSheet} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
          <View style={styles.grabberRow}>
            <View style={styles.grabber} />
          </View>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle} numberOfLines={1}>{sheetTitle}</Text>
            <Pressable onPress={closeSheet} style={styles.roundButton} hitSlop={4}>
              <CloseIcon size={14} color={ds.ink} strokeWidth={2.2} />
            </Pressable>
          </View>
          <ScrollView style={styles.sheetBody} contentContainerStyle={styles.sheetBodyContent}>
            <Field label="Receiver Name" value={draft.name} onChangeText={(v) => setField('name', v)} placeholder="Receiver name" />
            <Field label="Receiver Phone Number" value={draft.phone} onChangeText={(v) => setField('phone', v)} placeholder="+91 phone number" style={{ marginTop: dsSpacing.md }} />
            <Field label="Clinic/Pharmacy Name" value={draft.biz} onChangeText={(v) => setField('biz', v)} placeholder="Enter clinic/pharmacy name" style={{ marginTop: dsSpacing.md }} />

            <Text style={styles.fieldLabel}>Clinic/Pharmacy Address</Text>
            <View style={styles.textareaBox}>
              <TextInput
                value={draft.line}
                onChangeText={(v) => setField('line', v)}
                placeholder="Enter building name & number, street & area properly"
                placeholderTextColor={ds.ink3}
                multiline
                style={styles.textarea}
              />
            </View>

            <View style={styles.fieldRow}>
              <Field label="Landmark" value={draft.landmark} onChangeText={(v) => setField('landmark', v)} placeholder="Enter landmark" style={styles.fieldHalf} />
              <Field label="Pincode" value={draft.pincode} onChangeText={(v) => setField('pincode', v)} placeholder="Enter pincode" style={styles.fieldHalf} keyboardType="number-pad" />
            </View>
            <View style={styles.fieldRow}>
              <Field label="City" value={draft.city} onChangeText={(v) => setField('city', v)} placeholder="Enter city" style={styles.fieldHalf} muted />
              <Field label="State" value={draft.state} onChangeText={(v) => setField('state', v)} placeholder="Enter state" style={styles.fieldHalf} muted />
            </View>
          </ScrollView>
          <View style={styles.sheetFooter}>
            <Pressable onPress={saveAddress} disabled={saving} style={[styles.sheetCta, saving && styles.sheetCtaDisabled]}>
              {saving ? <ActivityIndicator color={ds.surface} /> : <Text style={styles.sheetCtaText}>{sheetCta}</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const Field = React.memo(function Field({
  label,
  value,
  onChangeText,
  placeholder,
  style,
  keyboardType,
  muted,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  style?: object;
  keyboardType?: 'default' | 'number-pad';
  muted?: boolean;
}) {
  return (
    <View style={style}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputBox, muted && styles.inputBoxMuted]}>
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
    justifyContent: 'space-between',
    gap: dsSpacing.md,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: dsSpacing.md, flex: 1, minWidth: 0 },
  roundButton: {
    flexShrink: 0,
    width: 32,
    height: 32,
    borderRadius: dsRadii.button,
    backgroundColor: ds.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 4 },
  addButtonText: { fontFamily: dsFontFamily[600], fontSize: 13, lineHeight: 18, color: ds.primaryInk },

  body: { flex: 1 },
  bodyContent: { padding: dsSpacing.lg, gap: dsSpacing.md, paddingBottom: dsSpacing.xl },
  loadingState: { paddingTop: dsSpacing.xl + dsSpacing.lg, alignItems: 'center' },
  emptyState: { paddingTop: dsSpacing.xl + dsSpacing.lg, alignItems: 'center' },
  emptyTitle: { fontFamily: dsFontFamily[600], fontSize: 16, lineHeight: 22, letterSpacing: -0.16, color: ds.ink },
  emptyBody: { fontFamily: dsFontFamily[400], fontSize: 14, lineHeight: 21, color: ds.ink2, marginTop: 4 },

  card: { backgroundColor: ds.surface, borderWidth: 1.6, borderRadius: dsRadii.button, padding: dsSpacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: dsSpacing.sm },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: dsSpacing.sm, flex: 1, minWidth: 0 },
  pinCircle: {
    flexShrink: 0,
    width: 32,
    height: 32,
    borderRadius: dsRadii.pill,
    backgroundColor: ds.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink, flex: 1, minWidth: 0 },
  cardActions: { flexShrink: 0, flexDirection: 'row', gap: dsSpacing.sm },
  iconButton: { width: 32, height: 32, borderRadius: dsRadii.input, backgroundColor: ds.canvas, alignItems: 'center', justifyContent: 'center' },
  iconButtonDanger: { backgroundColor: 'rgba(225,92,109,.12)' },
  cardBody: { fontFamily: dsFontFamily[400], fontSize: 13, lineHeight: 19, color: ds.ink2, marginTop: dsSpacing.sm },
  divider: { height: 1, backgroundColor: ds.line, marginVertical: dsSpacing.md },
  selectRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  selectedTag: { flexDirection: 'row', alignItems: 'center', gap: dsSpacing.sm },
  selectedText: { fontFamily: dsFontFamily[600], fontSize: 13, lineHeight: 18, color: ds.primaryInk },
  radioOn: {
    width: 16,
    height: 16,
    borderRadius: dsRadii.pill,
    borderWidth: 1.8,
    borderColor: ds.primary,
    backgroundColor: ds.primaryStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOnDot: { width: 6, height: 6, borderRadius: dsRadii.pill, backgroundColor: ds.surface },
  radioOff: { width: 16, height: 16, borderRadius: dsRadii.pill, borderWidth: 1.8, borderColor: ds.primary },

  overlay: { flex: 1, backgroundColor: 'rgba(12,71,51,.45)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '85%',
    backgroundColor: ds.surface,
    borderTopLeftRadius: dsRadii.sheet,
    borderTopRightRadius: dsRadii.sheet,
    overflow: 'hidden',
  },
  grabberRow: { alignItems: 'center', paddingTop: dsSpacing.sm },
  grabber: { width: 36, height: 4, borderRadius: dsRadii.pill, backgroundColor: ds.lineStrong },
  sheetHeader: {
    paddingHorizontal: dsSpacing.lg,
    paddingTop: dsSpacing.sm,
    paddingBottom: dsSpacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: dsSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ds.line,
  },
  sheetTitle: { ...dsType.h2, flex: 1, minWidth: 0 },
  sheetBody: { flexGrow: 0 },
  sheetBodyContent: { padding: dsSpacing.lg },
  fieldLabel: { fontFamily: dsFontFamily[600], fontSize: 13, lineHeight: 18, color: ds.ink2 },
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
  inputBoxMuted: { backgroundColor: ds.canvas },
  input: { ...dsType.body, padding: 0 },
  textareaBox: {
    marginTop: dsSpacing.sm,
    borderRadius: dsRadii.input,
    borderWidth: 1,
    borderColor: ds.lineStrong,
    backgroundColor: ds.surface,
    padding: dsSpacing.md,
  },
  textarea: { ...dsType.body, height: 56, textAlignVertical: 'top', padding: 0 },
  fieldRow: { flexDirection: 'row', gap: dsSpacing.md, marginTop: dsSpacing.md },
  fieldHalf: { flex: 1, minWidth: 0 },
  sheetFooter: { borderTopWidth: 1, borderTopColor: ds.line, padding: dsSpacing.md, paddingHorizontal: dsSpacing.lg },
  sheetCta: { height: 48, borderRadius: dsRadii.button, backgroundColor: ds.primaryStrong, alignItems: 'center', justifyContent: 'center' },
  sheetCtaDisabled: { opacity: 0.7 },
  sheetCtaText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.surface },
});
