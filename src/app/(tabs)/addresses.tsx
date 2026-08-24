import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ds, dsFontFamily, dsRadii, dsSpacing, dsType } from '@/theme';
import { AddressRemoveIcon, CloseIcon, EditPencilIcon, LocationPinIcon, PlusIcon, SmallBackChevronIcon } from '@/icons';
import { useAppState } from '@/state/AppStateContext';
import { ADDRESS_SEED, type AddressEntry } from '@/data/account-content';

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
// `isAddresses` block, screen_Addresses.html). First build — Account's "My Addresses" tile previously
// linked to a `StubScreen` placeholder.
//
// Unlike Account's round, this screen's full DCLogic (source lines 2540-2731: `addresses` seed,
// `select`/`edit`/`remove`, `addrSheetOpen`/`openAddAddress`/`saveAddress`) sat entirely IN RANGE of
// the 256KB `get_file` cap — read directly, nothing inferred. `ADDRESS_SEED` in `account-content.ts`
// is the exact seeded data (both entries are the same contact, 'Tom', at two different pharmacy/clinic
// locations), replacing that round's flagged placeholder count.
//
// Source quirks preserved verbatim, not "fixed": `openAddAddress` pre-fills the name/phone fields with
// the seed contact even in ADD mode (only biz/line/landmark/pincode/city/state start blank); the back
// button routes to Account specifically (`goAccount`), not a generic back; `remove` deletes immediately
// with no confirmation; there's no defined empty state for a fully-emptied list (the source's `sc-for`
// just renders nothing) — not invented here either; City/State fields render on a `canvas` background
// while every other field is `surface` (visual-only distinction in the source, not disabled inputs).
export default function AddressesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { flash } = useAppState();

  const [addresses, setAddresses] = useState<AddressEntry[]>(ADDRESS_SEED);
  const [selectedId, setSelectedId] = useState(ADDRESS_SEED[0]?.id ?? 1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mode, setMode] = useState<SheetMode>('add');
  const [editId, setEditId] = useState<number | null>(null);
  const [draft, setDraft] = useState<DraftFields>(EMPTY_DRAFT);

  const goAccount = () => router.push('/account');

  const openAdd = () => {
    setMode('add');
    setEditId(null);
    // Ported verbatim (source line 2718): pre-fills the seed contact's name/phone even in add mode.
    setDraft({ ...EMPTY_DRAFT, name: 'Tom', phone: '+91 9656950687' });
    setSheetOpen(true);
  };
  const openEdit = (a: AddressEntry) => {
    setMode('edit');
    setEditId(a.id);
    setDraft({ name: a.name, phone: a.phone, biz: a.label, line: a.line, landmark: a.landmark, pincode: a.pincode, city: a.city, state: a.state });
    setSheetOpen(true);
  };
  const closeSheet = () => setSheetOpen(false);
  const removeAddress = (id: number) => setAddresses((list) => list.filter((a) => a.id !== id));
  const selectAddress = (id: number) => setSelectedId(id);

  const setField = <K extends keyof DraftFields>(key: K, value: string) => setDraft((d) => ({ ...d, [key]: value }));

  const saveAddress = () => {
    const f: AddressEntry = {
      id: editId ?? Date.now(),
      name: draft.name,
      phone: draft.phone,
      label: draft.biz,
      line: draft.line,
      landmark: draft.landmark,
      pincode: draft.pincode,
      city: draft.city,
      state: draft.state,
    };
    setAddresses((list) => (mode === 'edit' ? list.map((a) => (a.id === f.id ? f : a)) : list.concat(f)));
    if (mode === 'add') setSelectedId(f.id);
    setSheetOpen(false);
    flash(mode === 'edit' ? 'Address updated' : 'Address added');
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
        {addresses.map((a) => {
          const selected = a.id === selectedId;
          return (
            <View key={a.id} style={[styles.card, { borderColor: selected ? ds.primary : ds.line }]}>
              <View style={styles.cardTop}>
                <View style={styles.cardTitleRow}>
                  <View style={styles.pinCircle}>
                    <LocationPinIcon size={15} color={ds.primaryInk} strokeWidth={1.7} />
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={1}>{a.label} - {a.name}</Text>
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
                {a.line}{'\n'}{a.city}, {a.state} {a.pincode}{'\n'}Phone: {a.phone}
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
            <Pressable onPress={saveAddress} style={styles.sheetCta}>
              <Text style={styles.sheetCtaText}>{sheetCta}</Text>
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
  sheetCtaText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.surface },
});
