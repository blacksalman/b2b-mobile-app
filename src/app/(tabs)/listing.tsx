import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontFamily } from '@/theme';
import { CloseIcon, FilterIcon, SearchIcon, SmallBackChevronIcon } from '@/icons';
import { ProductCard } from '@/components/composite/ProductCard';
import { FilterSheet } from '@/components/shell/FilterSheet';
import { getListingProducts } from '@/data/listing-content';
import { useAppState } from '@/state/AppStateContext';
import { productById } from '@/data/products';

function addFlashLabel(name: string): string {
  return name.split(' ').slice(0, 2).join(' ') + ' added';
}

// Ported verbatim from the source's generic Listing screen (line 653) — replaces what used to be two
// separate Brand and Category-detail screens; the source merged them into one `isListing` state
// (`screen:'listing'`) driven by `listingIds`/`listingTitle`/`listingTagline`/`listingTint`, now used
// for brand cards, category taps, prescription groups, concern shelves, promo banners, and Home's
// Best sellers/New arrivals/Featured "View all" links alike.
export default function ListingScreen() {
  const router = useRouter();
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
  const tint = params.tint || colors.mintTint;

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
  const goCart = () => router.push('/cart');
  const goLogin = () => router.push('/account');
  const goBack = () => router.back();

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.hero, { backgroundColor: tint }]}>
          <Pressable onPress={goBack} style={styles.backButton}>
            <SmallBackChevronIcon size={9} />
          </Pressable>
          <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,.5)']} style={styles.heroScrim}>
            <Text style={styles.heroTitle}>{title}</Text>
            <Text style={styles.heroTagline}>{tagline}</Text>
          </LinearGradient>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchInput}>
            <SearchIcon size={17} color={colors.bodyGray} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={`Search in ${title}…`}
              placeholderTextColor={colors.bodyGray}
              style={styles.input}
            />
          </View>
          <Pressable onPress={() => setFilterOpen(true)} style={styles.filterButton}>
            <FilterIcon size={17} />
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
                  <CloseIcon size={8} color={colors.forestGreen} strokeWidth={2.6} />
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
            <ProductCard
              key={p.id}
              variant="grid"
              dense
              listingMode
              ctaLabel="Add to Cart"
              ctaPill
              product={p}
              onOpen={() => openProduct(p.id)}
              onAdd={() => addProduct(p.id)}
              onInc={() => inc(p.id)}
              onDec={() => dec(p.id)}
              onGoCart={goCart}
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
  screen: { flex: 1, backgroundColor: colors.white },
  scrollContent: { paddingBottom: 24 },
  hero: { height: 230, position: 'relative', justifyContent: 'flex-end', overflow: 'hidden' },
  backButton: {
    position: 'absolute',
    top: 54,
    left: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  heroScrim: { padding: 18, paddingBottom: 18 },
  heroTitle: { fontFamily: fontFamily[700], fontSize: 22, color: colors.white, letterSpacing: 0.6 },
  heroTagline: { fontFamily: fontFamily[400], fontSize: 12.5, color: 'rgba(255,255,255,.85)', marginTop: 3 },
  searchRow: { flexDirection: 'row', gap: 9, padding: 14 },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    height: 44,
    paddingHorizontal: 12,
    borderWidth: 1.4,
    borderColor: colors.borderGray,
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  input: { flex: 1, fontFamily: fontFamily[400], fontSize: 13, color: colors.charcoal, padding: 0 },
  filterButton: { flexShrink: 0, width: 44, height: 44, borderRadius: 14, borderWidth: 1.4, borderColor: colors.borderGray, alignItems: 'center', justifyContent: 'center' },
  countRow: { paddingHorizontal: 14, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  countTitle: { fontFamily: fontFamily[700], fontSize: 20, color: colors.charcoal },
  countMeta: { fontFamily: fontFamily[400], fontSize: 12, color: colors.bodyGray },
  pillsRow: { paddingTop: 10 },
  pillsRowContent: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.mintTint, borderRadius: 999, paddingVertical: 8, paddingLeft: 13, paddingRight: 8 },
  pillText: { fontFamily: fontFamily[600], fontSize: 11.5, color: colors.forestGreen },
  pillRemove: { width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(15,61,46,.14)', alignItems: 'center', justifyContent: 'center' },
  clearAll: { fontFamily: fontFamily[600], fontSize: 11.5, color: colors.orange, paddingHorizontal: 4, paddingVertical: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 12, paddingTop: 12 },
});
