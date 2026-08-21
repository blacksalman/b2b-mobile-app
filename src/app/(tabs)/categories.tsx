import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamily } from '@/theme';
import { CloseIcon, FilterIcon, SearchIcon } from '@/icons';
import { CategoryRailItem } from '@/components/composite/CategoryRailItem';
import { ProductCard } from '@/components/composite/ProductCard';
import { FilterSheet, type FilterSelections } from '@/components/shell/FilterSheet';
import { catBanner, getCatProducts, type FilterTabName } from '@/data/categories-content';
import { categories } from '@/data/categories';
import { useAppState } from '@/state/AppStateContext';
import { productById } from '@/data/products';

function addFlashLabel(name: string): string {
  return name.split(' ').slice(0, 2).join(' ') + ' added';
}

const DEFAULT_SELECTIONS: FilterSelections = { sort: 'Popular', price: '', avail: [], brand: [], ing: [], concern: [], form: [] };

export default function CategoriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cart, loggedIn, addToCart, inc, dec, flash } = useAppState();

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(categories[0].name);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTabName>('Brand');
  const [selections, setSelections] = useState<FilterSelections>(DEFAULT_SELECTIONS);

  const catProducts = useMemo(() => getCatProducts(cart, loggedIn, query), [cart, loggedIn, query]);

  const hasActiveFilters =
    selections.sort !== 'Popular' ||
    !!selections.price ||
    selections.avail.length > 0 ||
    selections.brand.length > 0 ||
    selections.ing.length > 0 ||
    selections.concern.length > 0 ||
    selections.form.length > 0;

  const activePills: { key: string; label: string; remove: () => void }[] = [
    ...(selections.sort !== 'Popular' ? [{ key: 'sort', label: selections.sort, remove: () => setSelections((s) => ({ ...s, sort: 'Popular' })) }] : []),
    ...(selections.price ? [{ key: 'price', label: selections.price, remove: () => setSelections((s) => ({ ...s, price: '' })) }] : []),
    ...selections.avail.map((v) => ({ key: `avail-${v}`, label: v, remove: () => toggleMulti('avail', v) })),
    ...selections.brand.map((v) => ({ key: `brand-${v}`, label: v, remove: () => toggleMulti('brand', v) })),
    ...selections.ing.map((v) => ({ key: `ing-${v}`, label: v, remove: () => toggleMulti('ing', v) })),
    ...selections.concern.map((v) => ({ key: `concern-${v}`, label: v, remove: () => toggleMulti('concern', v) })),
    ...selections.form.map((v) => ({ key: `form-${v}`, label: v, remove: () => toggleMulti('form', v) })),
  ];

  function toggleMulti(kind: 'avail' | 'brand' | 'ing' | 'concern' | 'form', value: string) {
    setSelections((s) => ({
      ...s,
      [kind]: s[kind].includes(value) ? s[kind].filter((x) => x !== value) : [...s[kind], value],
    }));
  }

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
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <View style={styles.searchInput}>
          <SearchIcon size={17} color={colors.bodyGray} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search from 10,000+ products…"
            placeholderTextColor={colors.bodyGray}
            style={styles.input}
          />
          {!!query && (
            <Pressable onPress={() => setQuery('')} style={styles.clearButton} hitSlop={8}>
              <CloseIcon size={10} />
            </Pressable>
          )}
        </View>
        <Pressable onPress={() => setFilterOpen(true)} style={styles.filterButton}>
          <FilterIcon size={17} />
        </Pressable>
      </View>

      <View style={styles.body}>
        {!query && (
          <ScrollView style={styles.rail} contentContainerStyle={styles.railContent}>
            {categories.map((c) => (
              <CategoryRailItem key={c.name} name={c.name} active={activeCategory === c.name} onPress={() => setActiveCategory(c.name)} />
            ))}
          </ScrollView>
        )}

        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
          {hasActiveFilters && !query && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow} contentContainerStyle={styles.pillsRowContent}>
              {activePills.map((pill) => (
                <View key={pill.key} style={styles.pill}>
                  <Text style={styles.pillText}>{pill.label}</Text>
                  <Pressable onPress={pill.remove} style={styles.pillRemove} hitSlop={6}>
                    <CloseIcon size={8} color={colors.forestGreen} strokeWidth={2.6} />
                  </Pressable>
                </View>
              ))}
              <Pressable onPress={() => setSelections(DEFAULT_SELECTIONS)} hitSlop={8}>
                <Text style={styles.clearAll}>Clear all</Text>
              </Pressable>
            </ScrollView>
          )}

          {!query && (
            <View style={[styles.banner, { backgroundColor: catBanner.tint }]}>
              <Text style={styles.bannerTitle}>{catBanner.title}</Text>
              <Text style={styles.bannerSub}>{catBanner.sub}</Text>
            </View>
          )}

          {!!query && <Text style={styles.resultsLabel}>RESULTS FOR &quot;{query}&quot;</Text>}

          <View style={styles.grid}>
            {catProducts.map((p) => (
              <ProductCard
                key={p.id}
                variant="grid"
                dense
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
      </View>

      <FilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        activeTab={filterTab}
        onTabChange={setFilterTab}
        selections={selections}
        onToggleSort={(value) => setSelections((s) => ({ ...s, sort: value }))}
        onTogglePrice={(value) => setSelections((s) => ({ ...s, price: s.price === value ? '' : value }))}
        onToggleMulti={toggleMulti}
        onClear={() => setSelections(DEFAULT_SELECTIONS)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  topBar: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    flexDirection: 'row',
    gap: 9,
  },
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
  clearButton: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.borderGray, alignItems: 'center', justifyContent: 'center' },
  filterButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1.4, borderColor: colors.borderGray, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, flexDirection: 'row' },
  rail: { width: 74, flexGrow: 0, flexShrink: 0, overflow: 'hidden', borderRightWidth: 1, borderRightColor: colors.borderGray },
  railContent: { width: 74, paddingVertical: 10 },
  content: { flex: 1 },
  contentInner: { paddingBottom: 24 },
  pillsRow: { paddingTop: 14, paddingBottom: 10 },
  pillsRowContent: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.mintTint, borderRadius: 999, paddingVertical: 8, paddingLeft: 13, paddingRight: 8 },
  pillText: { fontFamily: fontFamily[600], fontSize: 11.5, color: colors.forestGreen },
  pillRemove: { width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(15,61,46,.14)', alignItems: 'center', justifyContent: 'center' },
  clearAll: { fontFamily: fontFamily[600], fontSize: 11.5, color: colors.orange, paddingHorizontal: 4, paddingVertical: 8 },
  banner: { margin: 14, marginTop: 14, borderRadius: 16, padding: 18 },
  bannerTitle: { fontFamily: fontFamily[700], fontSize: 17, lineHeight: 21, color: colors.charcoal, maxWidth: '70%' },
  bannerSub: { fontFamily: fontFamily[400], fontSize: 11.5, color: colors.bodyGray, marginTop: 6, maxWidth: '70%' },
  resultsLabel: { fontFamily: fontFamily[600], fontSize: 12, color: colors.bodyGray, letterSpacing: 0.7, paddingHorizontal: 14, paddingTop: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 14 },
});
