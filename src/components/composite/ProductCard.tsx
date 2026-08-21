import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily } from '@/theme';
import { CartIcon } from '@/icons';
import { QtyStepper } from '@/components/primitives/QtyStepper';
import type { RailProduct } from '@/data/home-content';

export interface TopBadge {
  text: string;
  background: string;
  color: string;
}

interface ProductCardHandlers {
  onOpen: () => void;
  onAdd: () => void;
  onInc: () => void;
  onDec: () => void;
  onGoCart: () => void;
  onLogin: () => void;
}

interface RailProps extends ProductCardHandlers {
  variant: 'rail';
  product: RailProduct;
  topBadge?: TopBadge;
  /** 'standard' = buyAgain/bestSellers/newArrivals/concerns (showPrice/gated split).
   *  'offerSplit' = featured (hasOffer/noOffer split, buttons always shown). */
  priceMode?: 'standard' | 'offerSplit';
  offer?: { hasOffer: boolean; noOffer: boolean };
}

interface GridProps extends ProductCardHandlers {
  variant: 'grid';
  product: RailProduct & { badge?: string; hasOffer?: boolean; noOffer?: boolean; selectOption?: boolean };
  /** Categories = true (badge + margin chip, hasOffer/noOffer split, 44px controls).
   *  Search = false (no badge/margin chip, unconditional price row, 46px controls). */
  dense: boolean;
  /** Categories' "notInCart" CTA text/shape (default "Add to order", radius 12) — the Listing screen
   *  uses "Add to Cart" in a fully round pill instead (source lines 603 vs 723-725). */
  ctaLabel?: string;
  ctaPill?: boolean;
  /** Only ever true on the Categories screen, and only for the single product at catalog index 1
   *  (source line 1601) — opens the variant-pack sheet instead of adding directly. */
  onSelectOption?: () => void;
  /** The Listing screen (source line 693) always shows the price row + an (occasionally empty)
   *  discount chip whenever the product isn't gated — unlike Categories' dense grid, which splits on
   *  hasOffer/noOffer to hide the chip and MRP line entirely when there's no discount. Set true only
   *  from the Listing screen. */
  listingMode?: boolean;
}

type ProductCardProps = RailProps | GridProps;

const RATING_STAR_COLOR = colors.starYellow;

export function ProductCard(props: ProductCardProps) {
  if (props.variant === 'rail') return <RailCard {...props} />;
  return <GridCard {...props} />;
}

function RatingChip({ rating }: { rating: string }) {
  return (
    <View style={styles.ratingChip}>
      <Text style={[styles.ratingStar, { color: RATING_STAR_COLOR }]}>★</Text>
      <Text style={styles.ratingText}>{rating}</Text>
    </View>
  );
}

function MarginChip({ margin }: { margin: string }) {
  return (
    <View style={styles.marginChip}>
      <Text style={styles.marginText}>Margin {margin}</Text>
    </View>
  );
}

function GatedBlock({ caseLabel, onLogin }: { caseLabel: string; onLogin: () => void }) {
  return (
    <View>
      <Text style={styles.metaText}>{caseLabel}</Text>
      <Pressable onPress={onLogin} hitSlop={4}>
        <Text style={styles.gatedText}>
          <Text style={styles.gatedLink}>Log in</Text> to view price
        </Text>
      </Pressable>
    </View>
  );
}

function CartControls({
  inCart,
  cartQty,
  onAdd,
  onInc,
  onDec,
  onGoCart,
  height,
  selectOption,
  onSelectOption,
  ctaLabel = 'Add to order',
  ctaPill = false,
}: {
  inCart: boolean;
  cartQty: number;
  onAdd: () => void;
  onInc: () => void;
  onDec: () => void;
  onGoCart: () => void;
  height: number;
  selectOption?: boolean;
  onSelectOption?: () => void;
  ctaLabel?: string;
  ctaPill?: boolean;
}) {
  if (inCart) {
    return (
      <View style={[styles.cartControlsRow, { marginTop: 10 }]}>
        <QtyStepper qty={cartQty} onInc={onInc} onDec={onDec} height={height} />
        <Pressable onPress={onGoCart} style={[styles.cartIconButton, { width: height, height }]}>
          <CartIcon size={16} color={colors.brandGreen} />
        </Pressable>
      </View>
    );
  }
  if (selectOption) {
    return (
      <Pressable onPress={onSelectOption} style={[styles.addButton, { height, marginTop: 10 }]}>
        <CartIcon size={13} color={colors.white} />
        <Text style={styles.addButtonText}>Select Option</Text>
      </Pressable>
    );
  }
  return (
    <Pressable onPress={onAdd} style={[styles.addButton, { height, marginTop: 10, borderRadius: ctaPill ? 999 : 12 }]}>
      <CartIcon size={13} color={colors.white} />
      <Text style={styles.addButtonText}>{ctaLabel}</Text>
    </Pressable>
  );
}

function RailCard({ product: p, topBadge, priceMode = 'standard', offer, onOpen, onAdd, onInc, onDec, onGoCart, onLogin }: RailProps) {
  return (
    <View style={styles.railCard}>
      <Pressable onPress={onOpen} style={[styles.image, { backgroundColor: p.tint }]}>
        {!!topBadge && (
          <View style={[styles.topBadge, { backgroundColor: topBadge.background }]}>
            <Text style={[styles.topBadgeText, { color: topBadge.color }]}>{topBadge.text}</Text>
          </View>
        )}
        <View style={styles.ratingChipAbs}>
          <RatingChip rating={p.rating} />
        </View>
      </Pressable>
      <View style={styles.body}>
        <MarginChip margin={p.margin} />
        <Pressable onPress={onOpen}>
          <Text style={[styles.name, { minHeight: 36 }]} numberOfLines={2}>{p.name}</Text>
        </Pressable>
        <Text style={styles.brandMeta}>Brand: {p.brandUpper}</Text>
        <View style={styles.divider} />

        {priceMode === 'offerSplit' ? (
          <>
            <View style={styles.priceRow}>
              {offer?.hasOffer && <Text style={styles.priceGreen}>{p.priceLabel}</Text>}
              {offer?.noOffer && <Text style={styles.priceDark}>MRP {p.priceLabel}</Text>}
              {offer?.hasOffer && (
                <View style={styles.discountChip}>
                  <Text style={styles.discountText}>{p.discount}</Text>
                </View>
              )}
            </View>
            {offer?.hasOffer && (
              <Text style={styles.compareText}>
                MRP <Text style={styles.strike}>{p.compareLabel}</Text> for each
              </Text>
            )}
            {offer?.noOffer && <Text style={styles.compareText}>for each</Text>}
            <CartControls inCart={p.inCart} cartQty={p.cartQty} onAdd={onAdd} onInc={onInc} onDec={onDec} onGoCart={onGoCart} height={46} />
          </>
        ) : p.gated ? (
          <GatedBlock caseLabel={p.caseLabel} onLogin={onLogin} />
        ) : (
          <>
            <View style={styles.priceRow}>
              <Text style={styles.priceGreen}>{p.priceLabel}</Text>
              <View style={styles.discountChip}>
                <Text style={styles.discountText}>{p.discount}</Text>
              </View>
            </View>
            <Text style={styles.compareText}>
              MRP <Text style={styles.strike}>{p.compareLabel}</Text> for each
            </Text>
            <CartControls inCart={p.inCart} cartQty={p.cartQty} onAdd={onAdd} onInc={onInc} onDec={onDec} onGoCart={onGoCart} height={46} />
          </>
        )}
      </View>
    </View>
  );
}

function GridCard({
  product: p,
  dense,
  onOpen,
  onAdd,
  onInc,
  onDec,
  onGoCart,
  onLogin,
  ctaLabel,
  ctaPill,
  onSelectOption,
  listingMode,
}: GridProps) {
  const controlHeight = dense ? 44 : 46;
  const cartControls = (
    <CartControls
      inCart={p.inCart}
      cartQty={p.cartQty}
      onAdd={onAdd}
      onInc={onInc}
      onDec={onDec}
      onGoCart={onGoCart}
      height={controlHeight}
      selectOption={p.selectOption}
      onSelectOption={onSelectOption}
      ctaLabel={ctaLabel}
      ctaPill={ctaPill}
    />
  );
  return (
    <View style={styles.gridCard}>
      <Pressable onPress={onOpen} style={[styles.image, { backgroundColor: p.tint }]}>
        {(dense || listingMode) && !!p.badge && (
          <View style={[styles.topBadge, { backgroundColor: colors.gold }]}>
            <Text style={[styles.topBadgeText, { color: colors.charcoal }]}>{p.badge}</Text>
          </View>
        )}
        <View style={styles.ratingChipAbs}>
          <RatingChip rating={p.rating} />
        </View>
      </Pressable>
      <View style={styles.body}>
        {(dense || listingMode) && <MarginChip margin={p.margin} />}
        <Pressable onPress={onOpen}>
          <Text
            style={[styles.name, { fontSize: dense || listingMode ? 13 : 14, minHeight: dense || listingMode ? 34 : 36, marginTop: dense || listingMode ? 9 : 0 }]}
            numberOfLines={2}
          >
            {p.name}
          </Text>
        </Pressable>
        <Text style={styles.brandMeta}>Brand: {p.brandUpper}</Text>
        <View style={styles.divider} />

        {p.gated ? (
          <GatedBlock caseLabel={p.caseLabel} onLogin={onLogin} />
        ) : listingMode ? (
          <>
            <View style={styles.priceRow}>
              <Text style={[styles.priceGreen, { fontSize: 15 }]}>{p.priceLabel}</Text>
              <View style={styles.discountChip}>
                <Text style={styles.discountText}>{p.discount}</Text>
              </View>
            </View>
            <Text style={[styles.compareText, { fontSize: 11.5 }]}>
              MRP <Text style={styles.strike}>{p.compareLabel}</Text> for each
            </Text>
            {cartControls}
          </>
        ) : dense ? (
          p.hasOffer ? (
            <>
              <View style={styles.priceRow}>
                <Text style={[styles.priceGreen, { fontSize: 15 }]}>{p.priceLabel}</Text>
                <View style={styles.discountChip}>
                  <Text style={styles.discountText}>{p.discount}</Text>
                </View>
              </View>
              <Text style={[styles.compareText, { fontSize: 11.5 }]}>
                MRP <Text style={styles.strike}>{p.compareLabel}</Text> for each
              </Text>
              {cartControls}
            </>
          ) : (
            <>
              <Text style={[styles.priceDark, { fontSize: 15 }]}>MRP {p.priceLabel}</Text>
              <Text style={[styles.compareText, { fontSize: 11.5 }]}>for each</Text>
              {cartControls}
            </>
          )
        ) : (
          <>
            <View style={styles.priceRow}>
              <Text style={styles.priceGreen}>{p.priceLabel}</Text>
              <View style={styles.discountChip}>
                <Text style={styles.discountText}>{p.discount}</Text>
              </View>
            </View>
            <Text style={styles.compareText}>
              MRP <Text style={styles.strike}>{p.compareLabel}</Text> for each
            </Text>
            {cartControls}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  railCard: {
    width: 176,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 16,
    overflow: 'hidden',
  },
  gridCard: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    height: 112,
  },
  topBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 5,
  },
  topBadgeText: {
    fontFamily: fontFamily[600],
    fontSize: 9.5,
  },
  ratingChipAbs: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderGray,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
  },
  ratingStar: { fontSize: 9.5 },
  ratingText: {
    fontFamily: fontFamily[600],
    fontSize: 9.5,
    color: colors.charcoal,
  },
  body: {
    padding: 11,
    paddingTop: 10,
    paddingBottom: 12,
  },
  marginChip: {
    backgroundColor: colors.mintTint,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  marginText: {
    fontFamily: fontFamily[600],
    fontSize: 10,
    color: colors.brandGreen,
  },
  name: {
    fontFamily: fontFamily[600],
    fontSize: 14,
    lineHeight: 18,
    color: colors.charcoal,
    marginTop: 9,
  },
  brandMeta: {
    fontFamily: fontFamily[400],
    fontSize: 10,
    color: colors.bodyGray,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderGray,
    marginVertical: 9,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  priceGreen: {
    fontFamily: fontFamily[700],
    fontSize: 16,
    color: colors.brandGreen,
  },
  priceDark: {
    fontFamily: fontFamily[700],
    fontSize: 16,
    color: colors.charcoal,
  },
  discountChip: {
    backgroundColor: colors.mintTint,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  discountText: {
    fontFamily: fontFamily[600],
    fontSize: 10,
    color: colors.brandGreen,
  },
  compareText: {
    fontFamily: fontFamily[400],
    fontSize: 12,
    color: colors.bodyGray,
    marginTop: 4,
  },
  strike: { textDecorationLine: 'line-through' },
  metaText: {
    fontFamily: fontFamily[400],
    fontSize: 10,
    color: colors.bodyGray,
  },
  gatedText: {
    fontFamily: fontFamily[400],
    fontSize: 10,
    color: colors.bodyGray,
    marginTop: 4,
  },
  gatedLink: {
    color: colors.brandGreen,
    textDecorationLine: 'underline',
  },
  cartControlsRow: {
    flexDirection: 'row',
    gap: 7,
  },
  cartIconButton: {
    borderRadius: 12,
    borderWidth: 1.6,
    borderColor: colors.brandGreen,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    borderRadius: 12,
    backgroundColor: colors.brandGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  addButtonText: {
    fontFamily: fontFamily[600],
    fontSize: 12,
    color: colors.white,
  },
});
