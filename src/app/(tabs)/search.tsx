import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ds, dsFontFamily, dsRadii, dsSpacing } from '@/theme';
import { BackChevronIcon, CloseIcon, SearchIcon, MicIcon } from '@/icons';
import { DsProductCard } from '@/components/ds/DsProductCard';
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
  // data), debounced 350ms so every keystroke doesn't fire a request.
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
      {/* ScrollView's default keyboardShouldPersistTaps ("never") swallows the FIRST tap on
          anything inside it while the keyboard is open - purely to dismiss the keyboard,
          without the tapped element's own onPress firing at all. That's exactly why the back
          button (and everything else here - recent chips, product cards) needed two taps
          whenever the keyboard was up. "handled" lets a tap on any actual touchable register
          normally; only tapping truly empty space still dismisses the keyboard. */}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
        <View style={styles.topRow}>
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

        {!hasQuery && recentSearches.length > 0 && (
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

        {hasQuery && (
          <>
            <Text style={styles.sectionLabel}>
              {search.loading
                ? 'SEARCHING…'
                : search.error
                  ? 'SEARCH FAILED'
                  : `RESULTS FOR "${query}" (${search.count})`}
            </Text>
            {!search.loading && !search.error && results.length === 0 && (
              <Text style={styles.emptyText}>No products match &quot;{query}&quot;.</Text>
            )}
            <View style={styles.grid}>
              {results.map((p) => (
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
          </>
        )}
      </ScrollView>

      <VariantSheet visible={!!variantSheetProduct} product={variantSheetProduct} onClose={() => setVariantSheetProduct(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ds.canvas },
  content: { paddingHorizontal: dsSpacing.lg, paddingBottom: dsSpacing.xl },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: dsSpacing.sm },
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: dsSpacing.md, marginTop: dsSpacing.md },
  emptyText: { fontFamily: dsFontFamily[400], fontSize: 14, lineHeight: 21, color: ds.ink3, marginTop: dsSpacing.md },
});
