import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamily } from '@/theme';
import { BackChevronIcon, CloseIcon, SearchIcon } from '@/icons';
import { ProductCard } from '@/components/composite/ProductCard';
import { getSearchResults, recentSearches } from '@/data/search-content';
import { useAppState } from '@/state/AppStateContext';
import { productById } from '@/data/products';

function addFlashLabel(name: string): string {
  return name.split(' ').slice(0, 2).join(' ') + ' added';
}

// Note: the source defines a `listening` state + voice-search panel (mic pulse, "Listening…",
// "Use 'lamb'"), but no element anywhere in the source markup actually calls `toggleVoice` — the
// voice-search UI is dead code in the shipped design (unreachable, like the gated-pricing path with
// no gated:true seed product). Per the fidelity rule we do not add a trigger button that doesn't
// exist in the source; `listening` stays false in practice here.
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
  const goCart = () => router.push('/cart');
  const goLogin = () => router.push('/account');

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.push('/')} style={styles.backButton} hitSlop={8}>
            <BackChevronIcon size={20} />
          </Pressable>
          <View style={styles.searchInput}>
            <SearchIcon size={17} color={colors.brandGreen} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search SKUs, brands, cases"
              placeholderTextColor={colors.bodyGray}
              style={styles.input}
            />
            {!!query && (
              <Pressable onPress={() => setQuery('')} style={styles.clearButton} hitSlop={8}>
                <CloseIcon size={10} />
              </Pressable>
            )}
          </View>
        </View>

        {listening && (
          <View style={styles.listeningPanel}>
            <View style={styles.micCircle}>
              <Text style={styles.micGlyph}>●</Text>
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
            <Text style={styles.recentLabel}>RECENT</Text>
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
            <Text style={styles.resultsLabel}>RESULTS FOR &quot;{query}&quot;</Text>
            <View style={styles.grid}>
              {results.map((p) => (
                <ProductCard
                  key={p.id}
                  variant="grid"
                  dense={false}
                  product={{ ...p, hasOffer: p.showPrice, noOffer: false }}
                  onOpen={() => openProduct(p.id)}
                  onAdd={() => addProduct(p.id)}
                  onInc={() => inc(p.id)}
                  onDec={() => dec(p.id)}
                  onGoCart={goCart}
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
  screen: { flex: 1, backgroundColor: colors.cardBg },
  content: { paddingHorizontal: 14, paddingBottom: 24 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  backButton: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    height: 46,
    paddingHorizontal: 12,
    borderWidth: 1.6,
    borderColor: colors.brandGreen,
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  input: { flex: 1, fontFamily: fontFamily[400], fontSize: 13.5, color: colors.charcoal, padding: 0 },
  clearButton: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.borderGray, alignItems: 'center', justifyContent: 'center' },
  listeningPanel: {
    marginTop: 14,
    backgroundColor: colors.forestGreen,
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
  },
  micCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' },
  micGlyph: { color: colors.white, fontSize: 10 },
  listeningTitle: { fontFamily: fontFamily[600], fontSize: 14, color: colors.white, marginTop: 14 },
  listeningSub: { fontFamily: fontFamily[400], fontSize: 11.5, color: 'rgba(255,255,255,.72)', marginTop: 4 },
  useButton: { marginTop: 14, backgroundColor: colors.gold, borderRadius: 11, paddingHorizontal: 16, paddingVertical: 10 },
  useButtonText: { fontFamily: fontFamily[600], fontSize: 12, color: colors.charcoal },
  recentLabel: { fontFamily: fontFamily[600], fontSize: 12, color: colors.bodyGray, letterSpacing: 0.7, marginTop: 18 },
  recentChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 9 },
  recentChip: { backgroundColor: colors.white, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  recentChipText: { fontFamily: fontFamily[500], fontSize: 11.5, color: colors.bodyGray },
  resultsLabel: { fontFamily: fontFamily[600], fontSize: 12, color: colors.bodyGray, letterSpacing: 0.7, marginTop: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 11 },
});
