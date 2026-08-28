import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ds, dsFontFamily, dsRadii, dsSpacing } from '@/theme';
import { BackChevronIcon, CloseIcon, SearchIcon, MicIcon } from '@/icons';
import { DsProductCard } from '@/components/ds/DsProductCard';
import { Skeleton } from '@/components/primitives/Skeleton';
import { VariantSheet } from '@/components/shell/VariantSheet';
import { useAppState } from '@/state/AppStateContext';
import { useProductSearch } from '@/data/searchApi';
import { useRecentSearches } from '@/data/recentSearches';
import { toRailProduct } from '@/data/homeApi';
import { useApiCartActions } from '@/data/useApiCartActions';
import { productHref } from '@/data/idHash';
import { useReviewSummaries } from '@/data/reviewsApi';
import type { Product } from '@/data/types';

// Rebuilt against the new AyurvedaOne design system (Various Mobile App - Phone.dc.html, isSearch
// block, line 750-833). Same fidelity note as the previous Search build: the source defines a
// `listening` state + full voice-search panel (mic pulse, "Listening…", 'Use "lamb"'), but nothing
// in the source markup ever calls `toggleVoice` — it's unreachable dead code in the shipped design,
// not a missing trigger button we should add. `listening` stays permanently false here, same as
// before; the panel JSX is kept (matching the source's own always-present-but-unreachable structure)
// rather than deleted.
export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cart, loggedIn } = useAppState();

  const [query, setQuery] = useState('');
  const [listening] = useState(false);
  const [variantSheetProduct, setVariantSheetProduct] = useState<Product | null>(null);
  const inputRef = useRef<TextInput>(null);

  // This is a persistent tab screen (Home's search bar navigates here, doesn't remount it), so
  // the keyboard needs to be opened explicitly every time the screen becomes focused - a plain
  // TextInput `autoFocus` only fires once, on first mount, which is why the keyboard previously
  // only appeared after a second manual tap. A short delay is needed because the tab-switch
  // transition itself can otherwise swallow the focus call.
  useFocusEffect(
    useCallback(() => {
      const timeout = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timeout);
    }, [])
  );

  // Real full-catalog search (GET /store/products-search) - see useProductSearch for why this
  // is a two-step fetch (search for the ranked id list, then hydrate price/collection/category
  // data), debounced 350ms so every keystroke doesn't fire a request. Real pagination
  // (PAGE_LIMIT per page, more via loadMore on scroll) rather than ever fetching every match at
  // once - a common term can match hundreds of products across this ~10k catalog.
  const search = useProductSearch(query);
  const reviewSummaries = useReviewSummaries(useMemo(() => search.results.map((p) => p.id), [search.results]));
  const results = useMemo(
    () => search.results.map((p) => toRailProduct(p, cart, loggedIn, reviewSummaries)),
    [search.results, cart, loggedIn, reviewSummaries]
  );
  const hasQuery = query.trim().length > 0;

  const { recentSearches, addRecentSearch } = useRecentSearches();
  // Recorded on submit (keyboard search/enter) rather than every debounced keystroke, so
  // typing "ashwagandha" doesn't leave "ash", "ashwa", "ashwagandh" etc. behind in history.
  const commitSearch = () => addRecentSearch(query);
  const openRecentSearch = (q: string) => {
    setQuery(q);
    addRecentSearch(q);
  };

  const openProduct = (p: { id: number; handle?: string }) => router.push(productHref(p));
  const { addApiProduct, incApiProduct, decApiProduct } = useApiCartActions();
  const goLogin = () => router.push('/account');

  return (
    <View style={styles.screen}>
      <View style={[styles.topRow, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.push('/')} style={styles.backButton} hitSlop={8}>
          <BackChevronIcon size={20} color={ds.ink} />
        </Pressable>
        <View style={styles.searchInput}>
          <SearchIcon size={17} color={ds.primaryInk} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={commitSearch}
            returnKeyType="search"
            placeholder="Search SKUs, brands, cases"
            placeholderTextColor={ds.ink3}
            style={styles.input}
          />
          {!!query && (
            <Pressable onPress={() => setQuery('')} style={styles.clearButton} hitSlop={8}>
              <CloseIcon size={10} color={ds.ink2} />
            </Pressable>
          )}
        </View>
      </View>

      {!hasQuery ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          {listening && (
            <View style={styles.listeningPanel}>
              <View style={styles.micCircle}>
                <MicIcon size={24} color={ds.surface} />
              </View>
              <Text style={styles.listeningTitle}>Listening…</Text>
              <Text style={styles.listeningSub}>Try &quot;two cases of lamb chops&quot;</Text>
              <Pressable onPress={() => setQuery('lamb')} style={styles.useButton}>
                <Text style={styles.useButtonText}>Use &quot;lamb&quot;</Text>
              </Pressable>
            </View>
          )}

          {recentSearches.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>RECENT</Text>
              <View style={styles.recentChips}>
                {recentSearches.map((q) => (
                  <Pressable key={q} onPress={() => openRecentSearch(q)} style={styles.recentChip}>
                    <Text style={styles.recentChipText}>{q}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      ) : (
        <FlatList
          keyboardShouldPersistTaps="handled"
          style={styles.body}
          contentContainerStyle={styles.content}
          data={results}
          keyExtractor={(p) => String(p.id)}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          // Real lazy loading: only PAGE_LIMIT products are ever fetched at a time
          // (useProductSearch/searchApi.ts) - scrolling near the bottom fetches the next page
          // instead of ever holding every match (potentially hundreds, across this ~10k
          // catalog) in memory at once.
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (search.hasMore) search.loadMore();
          }}
          ListHeaderComponent={
            <Text style={styles.sectionLabel}>
              {search.loading
                ? 'SEARCHING…'
                : search.error
                  ? 'SEARCH FAILED'
                  : `RESULTS FOR "${query}" (${search.count})`}
            </Text>
          }
          ListEmptyComponent={
            search.loading ? (
              <SearchResultsSkeleton />
            ) : !search.error ? (
              <Text style={styles.emptyText}>No products match &quot;{query}&quot;.</Text>
            ) : null
          }
          ListFooterComponent={
            search.loadingMore ? (
              <View style={styles.loadingMoreState}>
                <ActivityIndicator color={ds.primaryInk} />
              </View>
            ) : null
          }
          renderItem={({ item: p }) => (
            <DsProductCard
              product={p}
              width="48%"
              onOpen={() => openProduct(p)}
              onAdd={() => addApiProduct(p)}
              onInc={() => incApiProduct(p)}
              onDec={() => decApiProduct(p)}
              onLogin={goLogin}
              onSelectOption={() => setVariantSheetProduct(p)}
            />
          )}
        />
      )}

      <VariantSheet visible={!!variantSheetProduct} product={variantSheetProduct} onClose={() => setVariantSheetProduct(null)} />
    </View>
  );
}

// Reserves the results grid's real layout (2-column, matching DsProductCard at width="48%")
// while the search is still in flight - shown only on the very first page of a search (loading),
// not for loadMore (which gets its own small footer spinner instead, same convention as
// categoriesApi.ts's useCategoryProducts).
const SearchResultsSkeleton = React.memo(function SearchResultsSkeleton() {
  return (
    <View style={styles.skeletonGrid}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} width="48%" height={230} radius={dsRadii.sheet} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ds.canvas },
  content: { paddingHorizontal: dsSpacing.lg, paddingBottom: dsSpacing.xl },
  topRow: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: dsSpacing.sm,
    paddingHorizontal: dsSpacing.lg,
    paddingBottom: dsSpacing.md,
  },
  backButton: { width: 40, height: 40, borderRadius: dsRadii.pill, alignItems: 'center', justifyContent: 'center' },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: dsSpacing.sm,
    height: 44,
    paddingHorizontal: dsSpacing.md,
    borderWidth: 1.5,
    borderColor: ds.primary,
    borderRadius: dsRadii.sheet,
    backgroundColor: ds.surface,
  },
  input: { flex: 1, fontFamily: dsFontFamily[400], fontSize: 14, lineHeight: 21, color: ds.ink, padding: 0 },
  clearButton: { width: 20, height: 20, borderRadius: 10, backgroundColor: ds.line, alignItems: 'center', justifyContent: 'center' },
  listeningPanel: {
    marginTop: dsSpacing.lg,
    backgroundColor: ds.primaryStrong,
    borderRadius: dsRadii.sheet,
    padding: dsSpacing.lg,
    alignItems: 'center',
  },
  micCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: ds.accent, alignItems: 'center', justifyContent: 'center' },
  listeningTitle: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.surface, marginTop: dsSpacing.md },
  listeningSub: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: 'rgba(255,255,255,.72)', marginTop: 4 },
  useButton: { marginTop: dsSpacing.md, backgroundColor: ds.accent, borderRadius: dsRadii.button, paddingHorizontal: 16, paddingVertical: 8 },
  useButtonText: { fontFamily: dsFontFamily[600], fontSize: 13, lineHeight: 18, color: ds.ink },
  sectionLabel: { fontFamily: dsFontFamily[600], fontSize: 12, lineHeight: 16, letterSpacing: 0.48, color: ds.ink2, marginTop: dsSpacing.xl },
  recentChips: { flexDirection: 'row', flexWrap: 'wrap', gap: dsSpacing.sm, marginTop: dsSpacing.md },
  recentChip: { backgroundColor: ds.surface, borderWidth: 1, borderColor: ds.line, borderRadius: dsRadii.pill, paddingHorizontal: dsSpacing.md, paddingVertical: dsSpacing.sm },
  recentChipText: { fontFamily: dsFontFamily[400], fontSize: 14, lineHeight: 21, color: ds.ink2 },
  body: { flex: 1 },
  gridRow: { gap: dsSpacing.md, marginTop: dsSpacing.md },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: dsSpacing.md, marginTop: dsSpacing.md },
  emptyText: { fontFamily: dsFontFamily[400], fontSize: 14, lineHeight: 21, color: ds.ink3, marginTop: dsSpacing.md },
  loadingMoreState: { paddingVertical: dsSpacing.lg, alignItems: 'center' },
});
