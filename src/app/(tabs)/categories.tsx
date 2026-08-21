import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamily } from '@/theme';
import { CloseIcon, FilterIcon, SearchIcon, SmallBackChevronIcon } from '@/icons';
import { CategoryRailItem } from '@/components/composite/CategoryRailItem';
import { ProductCard } from '@/components/composite/ProductCard';
import { FilterSheet } from '@/components/shell/FilterSheet';
import { VariantSheet, type VariantPack } from '@/components/shell/VariantSheet';
import { catBanner, getCatProducts } from '@/data/categories-content';
import { categories } from '@/data/categories';
import { useAppState } from '@/state/AppStateContext';
import { productById } from '@/data/products';

function addFlashLabel(name: string): string {
  return name.split(' ').slice(0, 2).join(' ') + ' added';
}

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
  const [activeCategory, setActiveCategory] = useState(categories[0].name);

  // Variant-pack sheet (source line 1142) — only reachable from the single product with
  // `selectOption` true (catalog index 1, Ashwagandha Capsules). `variantCart` is the source's own
  // separate per-variant counter (`s.variantCart`), independent of the main cart quantity.
  const [variantProductId, setVariantProductId] = useState<number | null>(null);
  const [variantCart, setVariantCart] = useState<Record<string, number>>({});

  const catProducts = useMemo(() => getCatProducts(cart, loggedIn, query), [cart, loggedIn, query]);
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

  // Ported verbatim from `variantPacks`' add/inc/dec (source line 1587-1589): every tap ALSO nudges
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

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={goHome} style={styles.backButton}>
          <SmallBackChevronIcon size={9} />
        </Pressable>
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
                onSelectOption={() => openVariant(p.id)}
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
  backButton: { flexShrink: 0, width: 44, height: 44, borderRadius: 14, borderWidth: 1.4, borderColor: colors.borderGray, alignItems: 'center', justifyContent: 'center' },
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
