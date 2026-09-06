import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ds, dsFontFamily, dsRadii, dsSpacing, dsType } from '@/theme';
import { CloseIcon, FilterIcon, SearchIcon, SmallBackChevronIcon } from '@/icons';
import { DsProductCard } from '@/components/ds/DsProductCard';
import { FilterSheet } from '@/components/shell/FilterSheet';
import { VariantSheet } from '@/components/shell/VariantSheet';
import { getListingProducts } from '@/data/listing-content';
import { useAppState } from '@/state/AppStateContext';
import { productById } from '@/data/products';
import { useCategoryProducts, useProductFacets } from '@/data/categoriesApi';
import { toRailProduct } from '@/data/homeApi';
import { useApiCartActions } from '@/data/useApiCartActions';
import { productHref } from '@/data/idHash';
import { useReviewSummaries } from '@/data/reviewsApi';
import type { Product } from '@/data/types';

function addFlashLabel(name: string): string {
  return name.split(' ').slice(0, 2).join(' ') + ' added';
}

// Rebuilt against the new AyurvedaOne design system (Various Mobile App - Phone.dc.html, isListing
// block, line 660). Two data paths share this one screen now:
//
// - Real (Brand cards - index.tsx's openBrandListing): a `collectionId` param instead of `ids`.
//   A brand can have 40-160+ products, way past what's reasonable to pass as a comma-joined id
//   list in a URL, so this reuses Categories' own real product-fetch (useCategoryProducts,
//   locked to this one collection) rather than an ids-based approach. Sort/price/availability
//   filters are real here too (shared AppStateContext filters), search-in-brand is real
//   (products-search), cart is real (useApiCartActions) - the same infrastructure Categories/
//   Search already proved out, just scoped to one collection_id.
// - Mock (everything else - concern shelves, Best sellers/New arrivals/Featured "View all",
//   promo banners): still the original `ids`/getListingProducts path, unchanged - wiring those
//   to real data is a separate, not-yet-requested piece of work (they'd need product-section-id
//   scoped fetching, which useCategoryProducts doesn't support).
//
// `FilterSheet` itself is still the old-styled sheet — its restyle is deferred to a later round.
export default function ListingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ ids: string; collectionId: string; title: string; tagline: string; tint: string; image?: string }>();
  const {
    cart,
    loggedIn,
    addToCart,
    inc,
    dec,
    flash,
    bulkQtyThreshold,
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
  const [variantSheetProduct, setVariantSheetProduct] = useState<Product | null>(null);
  const isReal = !!params.collectionId;
  const { addApiProduct, incApiProduct, decApiProduct } = useApiCartActions();

  const title = params.title ?? '';
  const tagline = params.tagline ?? '';
  const tint = params.tint || ds.primarySoft;
  const heroImage = params.image || null;

  // Mock path.
  const ids = useMemo(() => (params.ids ? params.ids.split(',').map(Number).filter((n) => !Number.isNaN(n)) : []), [params.ids]);
  const mockListingProducts = useMemo(() => getListingProducts(ids, cart, loggedIn, query), [ids, cart, loggedIn, query]);

  const productFacets = useProductFacets();

  // Real path - sort/price/availability come from the shared filter state same as Categories;
  // brand is force-locked to this page's own collectionId regardless of filters.brand, since a
  // brand-scoped page picking a *different* brand doesn't make sense.
  const realFilters = useMemo(
    () => ({
      sort: filters.sort,
      price: filters.price,
      avail: filters.avail,
      brandCollectionIds: isReal ? [params.collectionId] : [],
      concerns: filters.concern,
      forms: filters.form,
      ingredients: filters.ing,
    }),
    [filters.sort, filters.price, filters.avail, isReal, params.collectionId, filters.concern, filters.form, filters.ing]
  );
  const productsState = useCategoryProducts(null, query, realFilters, isReal);
  const reviewSummaries = useReviewSummaries(useMemo(() => productsState.results.map((p) => p.id), [productsState.results]));
  const realListingProducts = useMemo(
    () => productsState.results.map((p) => toRailProduct(p, cart, loggedIn, reviewSummaries)),
    [productsState.results, cart, loggedIn, reviewSummaries]
  );

  const listingProducts = isReal ? realListingProducts : mockListingProducts;
  const itemCount = isReal ? productsState.count : ids.length;

  const openProduct = (p: { id: number; handle?: string }) => router.push(productHref(p));
  const addProduct = (id: number) => {
    const p = productById(id);
    addToCart(id, 1);
    if (p) flash(addFlashLabel(p.name));
  };
  const goLogin = () => router.push('/account');
  const goBack = () => router.back();

  // paddingTop below keeps the scroll content out from under the status bar. The hero used to run
  // full-bleed to the very top, which meant the sticky block pinned underneath the clock - and a
  // sticky element can't grow only while pinned, so no amount of padding on the block itself could
  // fix that without permanently displacing the hero. Insetting the whole screen solves it once:
  // the pinned block now stops at the status bar, and the band above it is the screen's own
  // background.
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Index 1 is the stickyHeader block (search + filter + product count), directly after the
          hero, so it pins to the top once you scroll past it - searching within a brand no longer
          means scrolling back up or leaving for Home. Categories does this with a fixed top bar
          outside its list; that isn't available here without displacing the hero, which is this
          screen's whole identity, so it sticks in place instead. The index is safe: the hero and
          that block are the first two children and neither is conditional. */}
      <ScrollView contentContainerStyle={styles.scrollContent} stickyHeaderIndices={[1]}>
        <View style={[styles.hero, { backgroundColor: tint }]}>
          {heroImage && <Image source={{ uri: heroImage }} style={styles.heroImage} contentFit="cover" />}
          {/* Plain 12 now, not insets.top + 12: the screen itself carries the status-bar inset, so
              the hero starts below it and this offset is measured from the hero's own top edge. */}
          <Pressable onPress={goBack} style={[styles.backButton, { top: 12 }]}>
            <SmallBackChevronIcon size={9} color={ds.ink} />
          </Pressable>
          <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,.5)']} style={styles.heroScrim}>
            <Text style={styles.heroTitle}>{title}</Text>
            <Text style={styles.heroTagline}>{tagline}</Text>
          </LinearGradient>
        </View>

        {/* Search, filter and the product count pin together as one block, so while you scroll the
            grid you can still search, filter, and see how many products you're looking at. They have
            to live inside a single View because stickyHeaderIndices pins one child, not a range. */}
        <View style={styles.stickyHeader}>
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
              {/* Same clear affordance Categories' search already has - without it, emptying a
                  search here meant holding backspace through the whole term. */}
              {!!query && (
                <Pressable onPress={() => setQuery('')} style={styles.clearButton} hitSlop={8}>
                  <CloseIcon size={10} color={ds.ink2} />
                </Pressable>
              )}
            </View>
            <Pressable onPress={() => setFilterOpen(true)} style={styles.filterButton}>
              <FilterIcon size={17} color={ds.ink} />
            </Pressable>
          </View>

          <View style={styles.countRow}>
            <Text style={styles.countTitle}>Products</Text>
            <Text style={styles.countMeta}>{isReal && productsState.loading ? 'Loading…' : `${itemCount} items`}</Text>
          </View>
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

        {isReal && productsState.loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={ds.primaryInk} />
          </View>
        ) : (
          <View style={styles.grid}>
            {listingProducts.map((p) => (
              <DsProductCard
                key={p.id}
                product={p}
                width="48%"
                onOpen={() => openProduct(p)}
                onAdd={() => (isReal ? addApiProduct(p) : addProduct(p.id))}
                onInc={() => (isReal ? incApiProduct(p) : inc(p.id))}
                onDec={() => (isReal ? decApiProduct(p) : dec(p.id))}
                onLogin={goLogin}
                onSelectOption={() => setVariantSheetProduct(p)}
                bulkQtyThreshold={bulkQtyThreshold}
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
        resultCount={isReal ? productsState.count : undefined}
        // No brandOptions here any more: the sheet no longer has a Brand section at all, which also
        // removes the empty "Brand" heading this page used to show (it passed an empty list on
        // purpose, being already locked to one brand via collectionId).
        formOptions={isReal ? productFacets.forms : undefined}
        ingredientOptions={isReal ? productFacets.ingredients : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ds.canvas },
  scrollContent: { paddingBottom: dsSpacing.xl },
  hero: { height: 220, position: 'relative', justifyContent: 'flex-end', overflow: 'hidden' },
  heroImage: { ...StyleSheet.absoluteFill },
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
  // Wraps search + count so they pin as one block. backgroundColor is required, not cosmetic: a
  // sticky block is drawn over the scrolling content, so a transparent one would have the product
  // grid sliding visibly underneath it. Also carries a bottom padding so the grid doesn't run into
  // the count row's baseline while pinned.
  stickyHeader: { backgroundColor: ds.canvas, paddingBottom: dsSpacing.sm },
  searchRow: { flexDirection: 'row', gap: dsSpacing.sm, paddingHorizontal: dsSpacing.lg, paddingTop: dsSpacing.lg },
  // minWidth: 0 is what keeps the filter button on the same line. A flex item's min-width defaults
  // to its content size, so this box - icon plus a placeholder as long as "Search in AyurVibes..." -
  // refused to shrink past that and pushed the 44px filter button onto its own row. RN 0.86's Yoga
  // follows the web spec here where the older one did not, which is why this only started after the
  // SDK 57 upgrade. Categories' own search doesn't hit it because nothing sits beside it.
  searchInput: {
    flex: 1,
    minWidth: 0,
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
  input: { flex: 1, minWidth: 0, ...dsType.body, padding: 0 },
  // Matches Categories' own clear button exactly, so the two search fields behave and read alike.
  clearButton: { flexShrink: 0, width: 20, height: 20, borderRadius: dsRadii.pill, backgroundColor: ds.line, alignItems: 'center', justifyContent: 'center' },
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
  loadingState: { paddingTop: dsSpacing.xl + dsSpacing.lg, alignItems: 'center' },
});
