import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ds, dsFontFamily, dsRadii, dsSpacing, dsType } from '@/theme';
import { CloseIcon, FilterIcon, SearchIcon, SmallBackChevronIcon } from '@/icons';
import { DsProductCard } from '@/components/ds/DsProductCard';
import { FilterSheet } from '@/components/shell/FilterSheet';
import { getListingProducts } from '@/data/listing-content';
import { useAppState } from '@/state/AppStateContext';
import { productById } from '@/data/products';

function addFlashLabel(name: string): string {
  return name.split(' ').slice(0, 2).join(' ') + ' added';
}

// Rebuilt against the new AyurvedaOne design system (Various Mobile App - Phone.dc.html, isListing
// block, line 660). Still the same generic Listing screen (line 653 in the old source) that replaced
// what used to be two separate Brand and Category-detail screens — driven by the same
// `listingIds`/`listingTitle`/`listingTagline`/`listingTint` route params, used for brand cards,
// category taps, prescription groups, concern shelves, promo banners, and Home's Best sellers/New
// arrivals/Featured "View all" links alike. Only the visual layer + `getListingProducts`' margin
// formula changed this round — the `ids`/`title`/`tagline`/`tint` param contract is untouched, so
// every existing call site (`index.tsx`'s `openListingByCategory`, `categories.tsx`'s category rail)
// keeps working unchanged. `FilterSheet` itself is still the old-styled sheet — its restyle is
// deferred to a later round, same as the Categories round.
export default function ListingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ ids: string; title: string; tagline: string; tint: string }>();
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

  const ids = useMemo(() => (params.ids ? params.ids.split(',').map(Number).filter((n) => !Number.isNaN(n)) : []), [params.ids]);
  const title = params.title ?? '';
  const tagline = params.tagline ?? '';
  const tint = params.tint || ds.primarySoft;

  // Ported verbatim from `listingItemCount:s.listingIds.length` (line 1597) — the RAW id-set size,
  // not the query-filtered count shown below it.
  const itemCount = ids.length;
  const listingProducts = useMemo(() => getListingProducts(ids, cart, loggedIn, query), [ids, cart, loggedIn, query]);

  const openProduct = (id: number) => router.push(`/product/${id}`);
  const addProduct = (id: number) => {
    const p = productById(id);
    addToCart(id, 1);
    if (p) flash(addFlashLabel(p.name));
  };
  const goLogin = () => router.push('/account');
  const goBack = () => router.back();

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.hero, { backgroundColor: tint }]}>
          <Pressable onPress={goBack} style={[styles.backButton, { top: insets.top + 12 }]}>
            <SmallBackChevronIcon size={9} color={ds.ink} />
          </Pressable>
          <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,.5)']} style={styles.heroScrim}>
            <Text style={styles.heroTitle}>{title}</Text>
            <Text style={styles.heroTagline}>{tagline}</Text>
          </LinearGradient>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchInput}>
            <SearchIcon size={17} color={ds.ink2} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={`Search in ${title}…`}
              placeholderTextColor={ds.ink2}
              style={styles.input}
            />
          </View>
          <Pressable onPress={() => setFilterOpen(true)} style={styles.filterButton}>
            <FilterIcon size={17} color={ds.ink} />
          </Pressable>
        </View>

        <View style={styles.countRow}>
          <Text style={styles.countTitle}>Products</Text>
          <Text style={styles.countMeta}>{itemCount} items</Text>
        </View>

        {hasActiveFilters && !query && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow} contentContainerStyle={styles.pillsRowContent}>
            {activeFilterPills.map((pill) => (
              <View key={pill.key} style={styles.pill}>
                <Text style={styles.pillText}>{pill.label}</Text>
                <Pressable onPress={pill.remove} style={styles.pillRemove} hitSlop={6}>
                  <CloseIcon size={10} color={ds.primaryInk} strokeWidth={2.6} />
                </Pressable>
              </View>
            ))}
            <Pressable onPress={clearFilters} hitSlop={8}>
              <Text style={styles.clearAll}>Clear all</Text>
            </Pressable>
          </ScrollView>
        )}

        <View style={styles.grid}>
          {listingProducts.map((p) => (
            <DsProductCard
              key={p.id}
              product={p}
              width="48%"
              onOpen={() => openProduct(p.id)}
              onAdd={() => addProduct(p.id)}
              onInc={() => inc(p.id)}
              onDec={() => dec(p.id)}
              onLogin={goLogin}
            />
          ))}
        </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ds.canvas },
  scrollContent: { paddingBottom: dsSpacing.xl },
  hero: { height: 220, position: 'relative', justifyContent: 'flex-end', overflow: 'hidden' },
  backButton: {
    position: 'absolute',
    left: dsSpacing.lg,
    width: 40,
    height: 40,
    borderRadius: dsRadii.pill,
    backgroundColor: 'rgba(255,255,255,.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  heroScrim: { padding: dsSpacing.lg, paddingBottom: dsSpacing.lg },
  heroTitle: { fontFamily: dsFontFamily[700], fontSize: 22, lineHeight: 28, color: ds.surface, letterSpacing: -0.22 },
  heroTagline: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: 'rgba(255,255,255,.85)', marginTop: 4 },
  searchRow: { flexDirection: 'row', gap: dsSpacing.sm, paddingHorizontal: dsSpacing.lg, paddingTop: dsSpacing.lg },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: dsSpacing.sm,
    height: 44,
    paddingHorizontal: dsSpacing.md,
    borderWidth: 1.4,
    borderColor: ds.line,
    borderRadius: dsRadii.sheet,
    backgroundColor: ds.surface,
  },
  input: { flex: 1, ...dsType.body, padding: 0 },
  filterButton: { flexShrink: 0, width: 44, height: 44, borderRadius: dsRadii.sheet, borderWidth: 1.4, borderColor: ds.line, alignItems: 'center', justifyContent: 'center' },
  countRow: { paddingHorizontal: dsSpacing.lg, paddingTop: dsSpacing.lg, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  countTitle: { ...dsType.h2 },
  countMeta: { ...dsType.meta },
  pillsRow: { flexGrow: 0 },
  pillsRowContent: { flexDirection: 'row', alignItems: 'center', gap: dsSpacing.sm, paddingHorizontal: dsSpacing.lg, paddingTop: dsSpacing.md },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dsSpacing.sm,
    backgroundColor: ds.primarySoft,
    borderRadius: dsRadii.pill,
    height: 32,
    paddingLeft: dsSpacing.md,
    paddingRight: dsSpacing.sm,
  },
  pillText: { fontFamily: dsFontFamily[600], fontSize: 12, lineHeight: 16, color: ds.primaryInk },
  pillRemove: { width: 20, height: 20, borderRadius: dsRadii.pill, backgroundColor: 'rgba(15,71,51,.14)', alignItems: 'center', justifyContent: 'center' },
  clearAll: { ...dsType.label, color: ds.accent, paddingHorizontal: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: dsSpacing.md, paddingHorizontal: dsSpacing.lg, paddingTop: dsSpacing.lg },
});
