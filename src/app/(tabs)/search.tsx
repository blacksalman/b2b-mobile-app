import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ds, dsFontFamily, dsRadii, dsSpacing } from '@/theme';
import { BackChevronIcon, CloseIcon, SearchIcon, MicIcon } from '@/icons';
import { DsProductCard } from '@/components/ds/DsProductCard';
import { getSearchResults, recentSearches } from '@/data/search-content';
import { useAppState } from '@/state/AppStateContext';
import { productById } from '@/data/products';

function addFlashLabel(name: string): string {
  return name.split(' ').slice(0, 2).join(' ') + ' added';
}

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
  const { cart, loggedIn, addToCart, inc, dec, flash } = useAppState();

  const [query, setQuery] = useState('');
  const [listening] = useState(false);

  const results = useMemo(() => getSearchResults(cart, loggedIn, query), [cart, loggedIn, query]);
  const hasQuery = query.trim().length > 0;

  const openProduct = (id: number) => router.push(`/product/${id}`);
  const addProduct = (id: number) => {
    const p = productById(id);
    addToCart(id, 1);
    if (p) flash(addFlashLabel(p.name));
  };
  const goLogin = () => router.push('/account');

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.push('/')} style={styles.backButton} hitSlop={8}>
            <BackChevronIcon size={20} color={ds.ink} />
          </Pressable>
          <View style={styles.searchInput}>
            <SearchIcon size={17} color={ds.primaryInk} />
            <TextInput
              value={query}
              onChangeText={setQuery}
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

        {!hasQuery && (
          <>
            <Text style={styles.sectionLabel}>RECENT</Text>
            <View style={styles.recentChips}>
              {recentSearches.map((q) => (
                <Pressable key={q} onPress={() => setQuery(q)} style={styles.recentChip}>
                  <Text style={styles.recentChipText}>{q}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {hasQuery && (
          <>
            <Text style={styles.sectionLabel}>RESULTS FOR &quot;{query}&quot;</Text>
            <View style={styles.grid}>
              {results.map((p) => (
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
          </>
        )}
      </ScrollView>
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
});
