import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ds, dsFontFamily, dsRadii, dsSpacing, dsType } from '@/theme';
import { CloseIcon, FilterIcon, PackageIcon, SearchIcon, SmallBackChevronIcon } from '@/icons';
import { DsProductCard } from '@/components/ds/DsProductCard';
import { FilterSheet } from '@/components/shell/FilterSheet';
import { VariantSheet, type VariantPack } from '@/components/shell/VariantSheet';
import { buildCategoryRail, countNonSortFilters, getCatBanner, getCatProducts } from '@/data/categories-content';
import { useAppState } from '@/state/AppStateContext';
import { productById } from '@/data/products';

function addFlashLabel(name: string): string {
  return name.split(' ').slice(0, 2).join(' ') + ' added';
}

// Rebuilt against the new AyurvedaOne design system (Various Mobile App - Phone.dc.html, isCategories
// block). Unlike the old design, the filter sheet's picks are no longer inert here — the new source
// really filters the grid by category + every filter-sheet pick (see categories-content.ts's
// `matchesCatFilters` port for the exact logic, including the "a live search query overrides every
// other filter" quirk carried over verbatim). `FilterSheet` itself is still the old-styled sheet —
// its restyle is deferred to a later round; only the data flowing through it changed.
export default function CategoriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    cart,
    loggedIn,
    addToCart,
    inc,
    dec,
    flash,
    filters,
    filterOpen,
    filterTab,
    setFilterOpen,
    setFilterTab,
    setFilterSort,
    setFilterPrice,
    toggleFilterMulti,
    clearFilters,
    hasActiveFilters,
    activeFilterPills,
  } = useAppState();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');

  // Variant-pack sheet (source line 1142/2916) — only reachable from the single product with
  // `selectOption` true (catalog index 1, Ashwagandha Capsules). `variantCart` is the source's own
  // separate per-variant counter (`s.variantCart`), independent of the main cart quantity.
  const [variantProductId, setVariantProductId] = useState<number | null>(null);
  const [variantCart, setVariantCart] = useState<Record<string, number>>({});

  const catProducts = useMemo(
    () => getCatProducts(cart, loggedIn, query, category, filters),
    [cart, loggedIn, query, category, filters],
  );
  const categoryRail = useMemo(() => buildCategoryRail(category, setCategory), [category]);
  const variantProduct = variantProductId != null ? productById(variantProductId) ?? null : null;

  const openProduct = (id: number) => router.push(`/product/${id}`);
  const addProduct = (id: number) => {
    const p = productById(id);
    addToCart(id, 1);
    if (p) flash(addFlashLabel(p.name));
  };
  const goCart = () => router.push('/cart');
  const goLogin = () => router.push('/account');
  const goHome = () => router.push('/');

  const openVariant = (id: number) => setVariantProductId(id);
  const closeVariant = () => setVariantProductId(null);

  // Ported verbatim from `variantPacks`' add/inc/dec (source line 2937-2939): every tap ALSO nudges
  // the main product's cart quantity by the pack's `mult`, independent of the small per-pack counter
  // shown in this sheet. See VariantSheet's own comment for why that's intentional, not a bug to fix.
  const addVariant = (pack: VariantPack) => {
    if (!variantProduct) return;
    addToCart(variantProduct.id, pack.mult);
    setVariantCart((s) => ({ ...s, [pack.key]: 1 }));
    flash(pack.label + ' added');
  };
  const incVariant = (pack: VariantPack) => {
    if (!variantProduct) return;
    addToCart(variantProduct.id, pack.mult);
    setVariantCart((s) => ({ ...s, [pack.key]: (s[pack.key] || 0) + 1 }));
  };
  const decVariant = (pack: VariantPack) => {
    if (!variantProduct) return;
    addToCart(variantProduct.id, -pack.mult);
    setVariantCart((s) => ({ ...s, [pack.key]: Math.max(0, (s[pack.key] || 0) - 1) }));
  };

  const hasQuery = query.trim().length > 0;
  const showCatBanner = !hasQuery && !!category;
  const catBanner = getCatBanner(category);
  const catHeading = hasQuery ? `“${query}”` : category || 'All products';
  // Ported verbatim (source line 2960/2966/2972/2983): this count deliberately excludes `sort`,
  // unlike `hasActiveFilters` (used for the pills row above), which does include it.
  const nonSortFilterCount = countNonSortFilters(filters);
  const catEmpty = catProducts.length === 0;

  const catEmptyTitle = hasQuery
    ? `No results for “${query}”`
    : nonSortFilterCount
      ? 'No products match these filters'
      : category
        ? `No lines in ${category} yet`
        : 'No products to show';
  const catEmptyBody = hasQuery
    ? 'Check the spelling, or clear the search to browse the full catalogue.'
    : nonSortFilterCount
      ? 'Try removing a filter or two to widen the results.'
      : 'We are onboarding suppliers for this category. Browse the full catalogue meanwhile.';
  const catEmptyCta = hasQuery ? 'Clear search' : nonSortFilterCount ? 'Clear all filters' : 'Browse all products';
  const catEmptyReset = () => {
    setQuery('');
    setCategory('');
    clearFilters();
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
            {categoryRail.map((c) => (
              <Pressable key={c.name} onPress={c.select} style={[styles.railChip, { backgroundColor: c.chipBg, borderColor: c.chipBorder }]}>
                <Text style={[styles.railChipText, { color: c.color }]}>{c.name}</Text>
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

        {showCatBanner && (
          <View style={[styles.banner, { backgroundColor: catBanner.tint }]}>
            <Text style={styles.bannerTitle}>{catBanner.title}</Text>
            <Text style={styles.bannerSub}>{catBanner.sub}</Text>
          </View>
        )}

        {catEmpty ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <PackageIcon size={28} color={ds.primaryInk} />
            </View>
            <Text style={styles.emptyTitle}>{catEmptyTitle}</Text>
            <Text style={styles.emptyBody}>{catEmptyBody}</Text>
            <Pressable onPress={catEmptyReset} style={styles.emptyCta}>
              <Text style={styles.emptyCtaText}>{catEmptyCta}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.grid}>
            {catProducts.map((p) => (
              <DsProductCard
                key={p.id}
                product={p}
                width="48%"
                onOpen={() => openProduct(p.id)}
                onAdd={() => addProduct(p.id)}
                onInc={() => inc(p.id)}
                onDec={() => dec(p.id)}
                onLogin={goLogin}
                onSelectOption={() => openVariant(p.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

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
      />

      <VariantSheet
        visible={variantProductId != null}
        product={variantProduct}
        variantCart={variantCart}
        onClose={closeVariant}
        onAdd={addVariant}
        onInc={incVariant}
        onDec={decVariant}
        onGoCart={goCart}
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
  railChipText: { fontFamily: dsFontFamily[600], fontSize: 11, lineHeight: 14, letterSpacing: 0.22 },
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
  banner: { marginTop: dsSpacing.md, marginHorizontal: dsSpacing.lg, borderRadius: dsRadii.button, padding: dsSpacing.md },
  bannerTitle: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink },
  bannerSub: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink2, marginTop: 4 },
  emptyState: { paddingVertical: dsSpacing.xl, paddingHorizontal: dsSpacing.lg, alignItems: 'center' },
  emptyIcon: { width: 64, height: 64, borderRadius: dsRadii.pill, backgroundColor: ds.primarySoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: dsFontFamily[600], fontSize: 16, lineHeight: 22, letterSpacing: -0.16, color: ds.ink, marginTop: dsSpacing.md, textAlign: 'center' },
  emptyBody: { fontFamily: dsFontFamily[400], fontSize: 14, lineHeight: 21, color: ds.ink2, marginTop: 4, textAlign: 'center' },
  emptyCta: { marginTop: dsSpacing.lg, height: 48, borderRadius: dsRadii.button, backgroundColor: ds.primaryStrong, alignItems: 'center', justifyContent: 'center', paddingHorizontal: dsSpacing.lg },
  emptyCtaText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.surface },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: dsSpacing.md, paddingHorizontal: dsSpacing.lg, paddingTop: dsSpacing.md },
});
