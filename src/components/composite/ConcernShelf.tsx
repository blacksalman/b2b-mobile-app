import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily } from '@/theme';
import { ArrowRightIcon, LeafInCircleIcon } from '@/icons';
import { ProductCard } from './ProductCard';
import type { Concern } from '@/data/home-content';

interface ConcernShelfProps {
  concern: Concern;
  onView: () => void;
  onOpenProduct: (id: number) => void;
  onAdd: (id: number) => void;
  onInc: (id: number) => void;
  onDec: (id: number) => void;
  onGoCart: () => void;
  onLogin: () => void;
}

// Ported verbatim from the Home concern shelves (line 404) — 4 of these repeat with their own tint,
// tags and product set. Products render with no top-left badge and no showPrice/gated split (the
// source shows price + buttons unconditionally here), reproduced via ProductCard's "standard" mode.
export function ConcernShelf({ concern, onView, onOpenProduct, onAdd, onInc, onDec, onGoCart, onLogin }: ConcernShelfProps) {
  return (
    <View style={[styles.panel, { backgroundColor: concern.tint }]}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{concern.title}</Text>
          <Text style={styles.blurb}>{concern.blurb}</Text>
        </View>
        <View style={styles.iconBox}>
          <LeafInCircleIcon size={30} />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsRow}>
        {concern.tags.map((t) => (
          <View key={t} style={styles.tag}>
            <Text style={styles.tagText}>{t}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.ctaRow}>
        <Pressable onPress={onView} style={styles.ctaButton}>
          <Text style={styles.ctaText}>Shop the shelf</Text>
          <ArrowRightIcon size={14} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productsRow}>
        {concern.products.map((p) => (
          <ProductCard
            key={p.id}
            variant="rail"
            product={p}
            priceMode="standard"
            onOpen={() => onOpenProduct(p.id)}
            onAdd={() => onAdd(p.id)}
            onInc={() => onInc(p.id)}
            onDec={() => onDec(p.id)}
            onGoCart={onGoCart}
            onLogin={onLogin}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginHorizontal: 14,
    marginTop: 22,
    borderRadius: 18,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
    padding: 16,
  },
  headerText: { flex: 1, minWidth: 0 },
  title: {
    fontFamily: fontFamily[700],
    fontSize: 20,
    lineHeight: 24,
    color: colors.charcoal,
  },
  blurb: {
    fontFamily: fontFamily[400],
    fontSize: 11.5,
    lineHeight: 17.25,
    color: colors.bodyGray,
    marginTop: 6,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  tag: {
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  tagText: { fontFamily: fontFamily[600], fontSize: 10.5, color: colors.forestGreen },
  ctaRow: { paddingHorizontal: 16, paddingBottom: 16 },
  ctaButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.brandGreen,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  ctaText: { fontFamily: fontFamily[600], fontSize: 12.5, color: colors.white },
  productsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 2,
  },
});
