import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamily } from '@/theme';
import { CloseIcon } from '@/icons';
import { CheckRow } from '@/components/primitives/CheckRow';
import {
  availOptions,
  brandOptions,
  concernOptions,
  filterTabNames,
  formOptions,
  ingredientOptions,
  priceOptions,
  sortOptions,
  type FilterTabName,
} from '@/data/categories-content';

export interface FilterSelections {
  sort: string;
  price: string;
  avail: string[];
  brand: string[];
  ing: string[];
  concern: string[];
  form: string[];
}

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  activeTab: FilterTabName;
  onTabChange: (tab: FilterTabName) => void;
  selections: FilterSelections;
  onToggleSort: (value: string) => void;
  onTogglePrice: (value: string) => void;
  onToggleMulti: (kind: 'avail' | 'brand' | 'ing' | 'concern' | 'form', value: string) => void;
  onClear: () => void;
}

// Ported verbatim from the Categories filter bottom-sheet (line 638): 80%-height sheet, 7-tab rail,
// per-tab option list. Selecting options here is inert by design in the source — "Apply"
// (closeCatFilter, line 724) just closes the sheet; it never filters the product grid, which is
// driven solely by the live search text. Replicated as-is per the fidelity rule.
export function FilterSheet({
  visible,
  onClose,
  activeTab,
  onTabChange,
  selections,
  onToggleSort,
  onTogglePrice,
  onToggleMulti,
  onClear,
}: FilterSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Filters</Text>
          <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
            <CloseIcon size={13} color={colors.charcoal} strokeWidth={2.2} />
          </Pressable>
        </View>

        <View style={styles.body}>
          <View style={styles.tabRail}>
            {filterTabNames.map((tab) => {
              const active = tab === activeTab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => onTabChange(tab)}
                  style={[
                    styles.tabItem,
                    { borderLeftColor: active ? colors.brandGreen : 'transparent', backgroundColor: active ? colors.cardBg : colors.white },
                  ]}
                >
                  <Text style={[styles.tabLabel, { color: active ? colors.brandGreen : colors.charcoal }]}>{tab}</Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView style={styles.options} contentContainerStyle={styles.optionsContent}>
            {activeTab === 'Brand' &&
              brandOptions.map((o) => (
                <CheckRow key={o} label={o} shape="square" selected={selections.brand.includes(o)} onPress={() => onToggleMulti('brand', o)} />
              ))}
            {activeTab === 'Sort By' &&
              sortOptions.map((o) => (
                <CheckRow key={o} label={o} shape="circle" selected={selections.sort === o} onPress={() => onToggleSort(o)} />
              ))}
            {activeTab === 'Price' &&
              priceOptions.map((o) => (
                <CheckRow key={o} label={o} shape="circle" selected={selections.price === o} onPress={() => onTogglePrice(o)} />
              ))}
            {activeTab === 'Availability' &&
              availOptions.map((o) => (
                <CheckRow key={o} label={o} shape="square" selected={selections.avail.includes(o)} onPress={() => onToggleMulti('avail', o)} />
              ))}
            {activeTab === 'Ingredients' &&
              ingredientOptions.map((o) => (
                <CheckRow key={o} label={o} shape="square" selected={selections.ing.includes(o)} onPress={() => onToggleMulti('ing', o)} />
              ))}
            {activeTab === 'Concern' &&
              concernOptions.map((o) => (
                <CheckRow key={o} label={o} shape="square" selected={selections.concern.includes(o)} onPress={() => onToggleMulti('concern', o)} />
              ))}
            {activeTab === 'Product form' &&
              formOptions.map((o) => (
                <CheckRow key={o} label={o} shape="square" selected={selections.form.includes(o)} onPress={() => onToggleMulti('form', o)} />
              ))}
          </ScrollView>
        </View>

        <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
          <Pressable onPress={onClear} style={[styles.footerButton, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.footerButtonText, { color: colors.charcoal }]}>Clear filters</Text>
          </Pressable>
          <Pressable onPress={onClose} style={[styles.footerButton, { backgroundColor: colors.brandGreen }]}>
            <Text style={[styles.footerButtonText, { color: colors.white }]}>Apply</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,.4)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '80%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontFamily: fontFamily[700], fontSize: 20, color: colors.charcoal },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, flexDirection: 'row' },
  tabRail: {
    width: 118,
    borderRightWidth: 1,
    borderRightColor: colors.borderGray,
  },
  tabItem: {
    paddingVertical: 15,
    paddingHorizontal: 14,
    borderLeftWidth: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tabLabel: { fontFamily: fontFamily[600], fontSize: 12.5 },
  options: { flex: 1 },
  optionsContent: { padding: 16 },
  footer: {
    padding: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
    flexDirection: 'row',
    gap: 10,
  },
  footerButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonText: { fontFamily: fontFamily[600], fontSize: 13.5 },
});
