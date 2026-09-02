import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ds, dsRadii, dsSpacing, dsType } from '@/theme';
import { CheckThinIcon, CloseIcon } from '@/icons';
import {
  availOptions,
  brandOptions as mockBrandOptions,
  concernOptions as mockConcernOptions,
  countNonSortFilters,
  formOptions as mockFormOptions,
  ingredientOptions as mockIngredientOptions,
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
  // No longer rendered — the new design dropped the tab rail in favour of showing every section at
  // once (see below). Still accepted (unused) so Categories/Listing's existing `activeTab`/
  // `onTabChange` props keep type-checking without touching those call sites this round.
  activeTab: FilterTabName;
  onTabChange: (tab: FilterTabName) => void;
  selections: FilterSelections;
  onToggleSort: (value: string) => void;
  onTogglePrice: (value: string) => void;
  onToggleMulti: (kind: 'avail' | 'brand' | 'ing' | 'concern' | 'form', value: string) => void;
  onClear: () => void;
  // Ported from the new source's `filterApplyLabel` ("Show N products"), which needs the live count of
  // products matching the current category/query/filters — data only the calling screen has. Optional
  // so Categories/Listing (not touched this round) still compile unchanged; falls back to a static
  // "Apply filters" label until a call site passes this.
  resultCount?: number;
  // Real collection names (Categories screen) override the mock catalog's fake brand list
  // (categories-content.ts's brandOptions, computed from mock products) - optional so Listing
  // (still fully mock, not touched this round) keeps using the mock list unchanged.
  brandOptions?: string[];
  // Real, catalog-wide values actually tagged on products (useProductFacets) override
  // categories-content.ts's static mock lists, same optional-override shape as brandOptions -
  // falls back to the mock lists if a caller doesn't pass these (there is currently none).
  concernOptions?: string[];
  formOptions?: string[];
  ingredientOptions?: string[];
}

// Rebuilt against the new AyurvedaOne design system (Various Mobile App - Phone.dc.html, the
// `catFilterOpen` block, source lines ~2282-2401). Unlike the old design's 7-tab rail (one section
// visible at a time), the new source shows every filter section in one scrolling sheet — Sort by,
// Price range, Availability, Brand, Concern, Product form, Key ingredient, in that exact order — each
// as a wrapped row of pill chips with a checkmark on the selected ones. `activeTab`/`onTabChange` are
// therefore vestigial here (kept only for the prop contract, see above); the tab rail itself is gone.
export function FilterSheet({
  visible,
  onClose,
  selections,
  onToggleSort,
  onTogglePrice,
  onToggleMulti,
  onClear,
  resultCount,
  brandOptions,
  concernOptions,
  formOptions,
  ingredientOptions,
}: FilterSheetProps) {
  const insets = useSafeAreaInsets();
  const effectiveBrandOptions = brandOptions ?? mockBrandOptions;
  const effectiveConcernOptions = concernOptions ?? mockConcernOptions;
  const effectiveFormOptions = formOptions ?? mockFormOptions;
  const effectiveIngredientOptions = ingredientOptions ?? mockIngredientOptions;

  const filterCount = countNonSortFilters(selections);
  const summaryText = filterCount === 0 ? 'Narrow down the catalogue' : filterCount === 1 ? '1 filter applied' : `${filterCount} filters applied`;
  const applyLabel = resultCount == null ? 'Apply filters' : resultCount === 1 ? 'Show 1 product' : `Show ${resultCount} products`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grabberRow}>
          <View style={styles.grabber} />
        </View>

        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={dsType.h2}>Filters</Text>
            <Text style={styles.headerSubtitle}>{summaryText}</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
            <CloseIcon size={14} color={ds.ink} strokeWidth={2.2} />
          </Pressable>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          <FilterSection
            title="Sort by"
            options={sortOptions}
            isSelected={(o) => selections.sort === o}
            onPick={onToggleSort}
          />
          <FilterSection
            title="Price range"
            options={priceOptions}
            isSelected={(o) => selections.price === o}
            onPick={onTogglePrice}
          />
          <FilterSection
            title="Availability"
            options={availOptions}
            isSelected={(o) => selections.avail.includes(o)}
            onPick={(o) => onToggleMulti('avail', o)}
          />
          <FilterSection
            title="Brand"
            options={effectiveBrandOptions}
            isSelected={(o) => selections.brand.includes(o)}
            onPick={(o) => onToggleMulti('brand', o)}
          />
          <FilterSection
            title="Concern"
            options={effectiveConcernOptions}
            isSelected={(o) => selections.concern.includes(o)}
            onPick={(o) => onToggleMulti('concern', o)}
          />
          <FilterSection
            title="Product form"
            options={effectiveFormOptions}
            isSelected={(o) => selections.form.includes(o)}
            onPick={(o) => onToggleMulti('form', o)}
          />
          <FilterSection
            title="Key ingredient"
            options={effectiveIngredientOptions}
            isSelected={(o) => selections.ing.includes(o)}
            onPick={(o) => onToggleMulti('ing', o)}
          />
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: dsSpacing.lg + insets.bottom }]}>
          <Pressable onPress={onClear} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear all</Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.applyButton}>
            <Text style={styles.applyButtonText}>{applyLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const FilterSection = React.memo(function FilterSection({
  title,
  options,
  isSelected,
  onPick,
}: {
  title: string;
  options: readonly string[];
  isSelected: (option: string) => boolean;
  onPick: (option: string) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.chipRow}>
        {options.map((o) => (
          <FilterChip key={o} label={o} selected={isSelected(o)} onPress={() => onPick(o)} />
        ))}
      </View>
    </View>
  );
});

const FilterChip = React.memo(function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected ? styles.chipSelected : styles.chipUnselected]}>
      {selected && <CheckThinIcon size={12} color={ds.primaryInk} />}
      <Text style={[dsType.micro, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(12,71,51,.45)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '84%',
    backgroundColor: ds.canvas,
    borderTopLeftRadius: dsRadii.sheet,
    borderTopRightRadius: dsRadii.sheet,
    overflow: 'hidden',
  },
  grabberRow: {
    flexShrink: 0,
    alignItems: 'center',
    paddingTop: dsSpacing.sm,
    backgroundColor: ds.surface,
  },
  grabber: { width: 36, height: 4, borderRadius: dsRadii.pill, backgroundColor: ds.lineStrong },
  header: {
    flexShrink: 0,
    backgroundColor: ds.surface,
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
  headerText: { flex: 1, minWidth: 0 },
  headerSubtitle: { ...dsType.meta, marginTop: 4 },
  closeButton: {
    flexShrink: 0,
    width: 32,
    height: 32,
    borderRadius: dsRadii.button,
    backgroundColor: ds.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: dsSpacing.lg, paddingBottom: dsSpacing.lg },
  section: { paddingTop: dsSpacing.lg },
  sectionTitle: { ...dsType.label },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: dsSpacing.sm, marginTop: dsSpacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 36,
    paddingHorizontal: dsSpacing.md,
    borderRadius: dsRadii.pill,
    borderWidth: 1.5,
  },
  chipUnselected: { backgroundColor: ds.surface, borderColor: ds.line },
  chipSelected: { backgroundColor: ds.primarySoft, borderColor: ds.primary },
  chipTextSelected: { color: ds.primaryInk },
  footer: {
    flexShrink: 0,
    backgroundColor: ds.surface,
    borderTopWidth: 1,
    borderTopColor: ds.line,
    paddingHorizontal: dsSpacing.lg,
    paddingTop: dsSpacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: dsSpacing.sm,
  },
  clearButton: {
    flexShrink: 0,
    height: 48,
    paddingHorizontal: dsSpacing.lg,
    borderRadius: dsRadii.button,
    backgroundColor: ds.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: { ...dsType.title },
  applyButton: {
    flex: 1,
    height: 48,
    borderRadius: dsRadii.button,
    backgroundColor: ds.primaryStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: { ...dsType.title, color: ds.surface },
});
