import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ds, dsFontFamily, dsRadii, dsSpacing, dsType } from '@/theme';
import { CloseIcon, FilterIcon, PackageIcon, SearchIcon, SmallBackChevronIcon } from '@/icons';
import { DsProductCard } from '@/components/ds/DsProductCard';
import { FilterSheet } from '@/components/shell/FilterSheet';
import { VariantSheet } from '@/components/shell/VariantSheet';
import { countNonSortFilters } from '@/data/categories-content';
import { useAppState } from '@/state/AppStateContext';
import { useProductCategories, useCategoryProducts, useCollections } from '@/data/categoriesApi';
import { toRailProduct } from '@/data/homeApi';
import { useApiCartActions } from '@/data/useApiCartActions';
import { productHref } from '@/data/idHash';
import type { Product } from '@/data/types';

// Rebuilt against the new AyurvedaOne design system (Various Mobile App - Phone.dc.html, isCategories
// block). Real-data version: the product grid, category rail, and search are all backed by the
// backend now (GET /store/product-categories for the rail, GET /store/products-search +
// fetchProductsByIds for the grid - see categoriesApi.ts). Of the filter sheet's 7 sections,
// Sort/Price/Availability/Brand are wired to the real fetch (Brand via the 2 real collections,
// not the old mock brand list); Concern/Product form/Key ingredient stay mock/inert - checked
// the backend and none of those three map to any real attribute (product_type here is GST tax
// rate, not form; product_tag is empty - zero ingredient/concern tagging exists at all).
// `FilterSheet` itself is still the old-styled sheet — its restyle is deferred to a later round.
export default function CategoriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Home's category tiles (openCategory) pass a real category id here so this screen lands
  // pre-selected instead of always opening to "All products". Categories is a persistent tab
  // screen, not remounted per navigation, so an initial useState alone would only apply on the
  // very first visit - the effect below re-syncs on every subsequent navigation too (including
  // back to no categoryId at all, e.g. a plain "Explore full catalogue" tap elsewhere, which
  // correctly resets to "All products" rather than leaving a stale selection behind).
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const {
    cart,
    loggedIn,
    filterOpen,
    filterTab,
    setFilterOpen,
    setFilterTab,
    setFilterSort,
    setFilterPrice,
    filters,
    toggleFilterMulti,
    clearFilters,
    hasActiveFilters,
    activeFilterPills,
  } = useAppState();

  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(params.categoryId ?? null);
  const [variantSheetProduct, setVariantSheetProduct] = useState<Product | null>(null);

  useEffect(() => {
    setCategoryId(params.categoryId ?? null);
  }, [params.categoryId]);

  const realCategories = useProductCategories();
  const categoryName = categoryId ? (realCategories.find((c) => c.id === categoryId)?.name ?? '') : '';

  const realCollections = useCollections();
  const brandOptions = useMemo(() => realCollections.map((c) => c.title), [realCollections]);
  // filters.brand holds NAMES (what the sheet displays/toggles) - resolved to real collection
  // ids here since that's the only thing GET /store/products-search's collection_id accepts.
  // Memoized so this array's identity only changes when the actual selection does - it's a
  // useCategoryProducts dependency, and a fresh array every render would refetch on every
  // unrelated re-render.
  const brandCollectionIds = useMemo(
    () =>
      filters.brand
        .map((name) => realCollections.find((c) => c.title === name)?.id)
        .filter((id): id is string => !!id),
    [filters.brand, realCollections]
  );
  const categoryFilters = useMemo(
    () => ({ sort: filters.sort, price: filters.price, avail: filters.avail, brandCollectionIds }),
    [filters.sort, filters.price, filters.avail, brandCollectionIds]
  );
  const productsState = useCategoryProducts(categoryId, query, categoryFilters);
  const catProducts = useMemo(
    () => productsState.results.map((p) => toRailProduct(p, cart, loggedIn)),
    [productsState.results, cart, loggedIn]
  );
  const openProduct = (p: { id: number; handle?: string }) => router.push(productHref(p));
  const { addApiProduct, incApiProduct, decApiProduct } = useApiCartActions();
  const goLogin = () => router.push('/account');
  const goHome = () => router.push('/');

  const hasQuery = query.trim().length > 0;
  const catHeading = hasQuery ? `“${query}”` : categoryName || 'All products';
  // Ported verbatim (source line 2960/2966/2972/2983): this count deliberately excludes `sort`,
  // unlike `hasActiveFilters` (used for the pills row above), which does include it. Still shown
  // on the filter badge even though filters don't affect the real grid right now (see the
  // file-level note) - it's just reflecting what's selected, same as the pills row.
  const nonSortFilterCount = countNonSortFilters(filters);
  const catEmpty = !productsState.loading && !productsState.error && catProducts.length === 0;

  const catEmptyTitle = productsState.error
    ? 'Could not load products'
    : hasQuery
      ? `No results for “${query}”`
      : categoryName
        ? `No products in ${categoryName} yet`
        : 'No products to show';
  const catEmptyBody = productsState.error
    ? 'Something went wrong reaching the catalogue. Try again in a moment.'
    : hasQuery
      ? 'Check the spelling, or clear the search to browse the full catalogue.'
      : categoryName
        ? 'Try another category or browse the full catalogue.'
        : 'Please check back soon.';
  const catEmptyCta = hasQuery ? 'Clear search' : categoryName ? 'Browse all products' : '';
  const catEmptyReset = () => {
    setQuery('');
    setCategoryId(null);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <View style={[styles.headerRow, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={goHome} style={styles.roundButton} hitSlop={4}>
            <SmallBackChevronIcon size={9} color={ds.ink} />
          </Pressable>
          <Text style={styles.heading} numberOfLines={1}>
            {catHeading}
          </Text>
          <Pressable onPress={() => setFilterOpen(true)} style={styles.roundButton} hitSlop={4}>
            <FilterIcon size={16} color={ds.ink} />
            {hasActiveFilters && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{nonSortFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchInput}>
            <SearchIcon size={16} color={ds.ink2} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search products or brands"
              placeholderTextColor={ds.ink2}
              style={styles.input}
            />
            {hasQuery && (
              <Pressable onPress={() => setQuery('')} style={styles.clearButton} hitSlop={8}>
                <CloseIcon size={10} color={ds.ink2} />
              </Pressable>
            )}
          </View>
        </View>

        {!hasQuery && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rail} contentContainerStyle={styles.railContent}>
            <Pressable
              onPress={() => setCategoryId(null)}
              style={[styles.railChip, categoryId === null ? styles.railChipActive : styles.railChipInactive]}
            >
              <Text style={[styles.railChipText, categoryId === null ? styles.railChipTextActive : styles.railChipTextInactive]}>
                All
              </Text>
            </Pressable>
            {realCategories.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setCategoryId(c.id)}
                style={[styles.railChip, categoryId === c.id ? styles.railChipActive : styles.railChipInactive]}
              >
                <Text style={[styles.railChipText, categoryId === c.id ? styles.railChipTextActive : styles.railChipTextInactive]}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {hasActiveFilters && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow} contentContainerStyle={styles.pillsRowContent}>
            {activeFilterPills.map((pill) => (
              <View key={pill.key} style={styles.pill}>
                <Text style={styles.pillText}>{pill.label}</Text>
                <Pressable onPress={pill.remove} style={styles.pillRemove} hitSlop={6}>
                  <CloseIcon size={8} color={ds.primaryInk} strokeWidth={2.6} />
                </Pressable>
              </View>
            ))}
            <Pressable onPress={clearFilters} hitSlop={8}>
              <Text style={styles.clearAll}>Clear all</Text>
            </Pressable>
          </ScrollView>
        )}

        {productsState.loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={ds.primaryInk} />
          </View>
        ) : catEmpty ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <PackageIcon size={28} color={ds.primaryInk} />
            </View>
            <Text style={styles.emptyTitle}>{catEmptyTitle}</Text>
            <Text style={styles.emptyBody}>{catEmptyBody}</Text>
            {!!catEmptyCta && (
              <Pressable onPress={catEmptyReset} style={styles.emptyCta}>
                <Text style={styles.emptyCtaText}>{catEmptyCta}</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.grid}>
            {catProducts.map((p) => (
              <DsProductCard
                key={p.id}
                product={p}
                width="48%"
                onOpen={() => openProduct(p)}
                onAdd={() => addApiProduct(p)}
                onInc={() => incApiProduct(p)}
                onDec={() => decApiProduct(p)}
                onLogin={goLogin}
                onSelectOption={() => setVariantSheetProduct(p)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <VariantSheet visible={!!variantSheetProduct} product={variantSheetProduct} onClose={() => setVariantSheetProduct(null)} />

      <FilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        activeTab={filterTab}
        onTabChange={setFilterTab}
        selections={filters}
        onToggleSort={setFilterSort}
        onTogglePrice={setFilterPrice}
        onToggleMulti={toggleFilterMulti}
        onClear={clearFilters}
        brandOptions={brandOptions}
        resultCount={productsState.count}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ds.canvas },
  topBar: {
    flexShrink: 0,
    backgroundColor: ds.surface,
    borderBottomWidth: 1,
    borderBottomColor: ds.line,
  },
  headerRow: {
    paddingHorizontal: dsSpacing.lg,
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
  filterBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: dsRadii.pill,
    backgroundColor: ds.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: { fontFamily: dsFontFamily[600], fontSize: 11, lineHeight: 14, letterSpacing: 0.22, color: ds.surface },
  heading: { flex: 1, minWidth: 0, ...dsType.h2 },
  searchRow: { paddingHorizontal: dsSpacing.lg, paddingTop: dsSpacing.md },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dsSpacing.sm,
    height: 40,
    paddingHorizontal: dsSpacing.md,
    borderWidth: 1,
    borderColor: ds.lineStrong,
    borderRadius: dsRadii.input,
  },
  input: { flex: 1, ...dsType.body, padding: 0 },
  clearButton: { width: 20, height: 20, borderRadius: dsRadii.pill, backgroundColor: ds.line, alignItems: 'center', justifyContent: 'center' },
  rail: { flexGrow: 0 },
  railContent: { flexDirection: 'row', gap: dsSpacing.sm, paddingHorizontal: dsSpacing.lg, paddingVertical: dsSpacing.md },
  railChip: { flexShrink: 0, height: 36, paddingHorizontal: dsSpacing.md, borderRadius: dsRadii.pill, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  railChipActive: { backgroundColor: '#DCF5E9', borderColor: '#25A567' },
  railChipInactive: { backgroundColor: '#F6F8F7', borderColor: 'transparent' },
  railChipText: { fontFamily: dsFontFamily[600], fontSize: 11, lineHeight: 14, letterSpacing: 0.22 },
  railChipTextActive: { color: '#0C4733' },
  railChipTextInactive: { color: '#586360' },
  loadingState: { paddingTop: dsSpacing.xl + dsSpacing.lg, alignItems: 'center' },
  body: { flex: 1 },
  bodyContent: { paddingBottom: dsSpacing.xl },
  pillsRow: { flexGrow: 0 },
  pillsRowContent: { flexDirection: 'row', alignItems: 'center', gap: dsSpacing.sm, paddingHorizontal: dsSpacing.lg, paddingTop: dsSpacing.md },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dsSpacing.sm,
    backgroundColor: ds.primarySoft,
    borderWidth: 1.5,
    borderColor: ds.primary,
    borderRadius: dsRadii.pill,
    height: 36,
    paddingLeft: dsSpacing.md,
    paddingRight: dsSpacing.sm,
  },
  pillText: { fontFamily: dsFontFamily[600], fontSize: 11, lineHeight: 14, letterSpacing: 0.22, color: ds.primaryInk },
  pillRemove: { width: 20, height: 20, borderRadius: dsRadii.pill, backgroundColor: ds.surface, alignItems: 'center', justifyContent: 'center' },
  clearAll: { fontFamily: dsFontFamily[600], fontSize: 13, lineHeight: 18, color: ds.accent, paddingHorizontal: 4 },
  emptyState: { paddingVertical: dsSpacing.xl, paddingHorizontal: dsSpacing.lg, alignItems: 'center' },
  emptyIcon: { width: 64, height: 64, borderRadius: dsRadii.pill, backgroundColor: ds.primarySoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: dsFontFamily[600], fontSize: 16, lineHeight: 22, letterSpacing: -0.16, color: ds.ink, marginTop: dsSpacing.md, textAlign: 'center' },
  emptyBody: { fontFamily: dsFontFamily[400], fontSize: 14, lineHeight: 21, color: ds.ink2, marginTop: 4, textAlign: 'center' },
  emptyCta: { marginTop: dsSpacing.lg, height: 48, borderRadius: dsRadii.button, backgroundColor: ds.primaryStrong, alignItems: 'center', justifyContent: 'center', paddingHorizontal: dsSpacing.lg },
  emptyCtaText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.surface },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: dsSpacing.md, paddingHorizontal: dsSpacing.lg, paddingTop: dsSpacing.md },
});
