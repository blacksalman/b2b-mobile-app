import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamily } from '@/theme';
import { ArrowRightIcon, CartIcon, ChevronDownIcon, ChevronRightIcon, CheckThinIcon, CloseIcon, PlayIcon, SmallBackChevronIcon, StarIcon } from '@/icons';
import { ProductCard } from '@/components/composite/ProductCard';
import { buildVariantPacks } from '@/components/shell/VariantSheet';
import { discountBadgeOrEmpty } from '@/data/decorateProduct';
import { productById } from '@/data/products';
import {
  brandAbout,
  brandLegalName,
  brandShort,
  brandStats,
  brandUsps,
  bulkTiersFor,
  getAlsoBought,
  getSimilarProducts,
  productDescriptionFor,
  productMargin,
} from '@/data/product-detail-content';
import { money } from '@/utils/money';
import { useAppState } from '@/state/AppStateContext';
import { StubScreen } from '@/components/shell/StubScreen';

function addFlashLabel(name: string): string {
  return name.split(' ').slice(0, 2).join(' ') + ' added';
}

// Ported verbatim from the source's `isProduct` (line 826) — see the design-sync spec
// (scratchpad/product-cart-checkout-spec.md §1) for the full section-by-section breakdown.
export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cart, loggedIn, addToCart, inc, dec, flash } = useAppState();

  const product = productById(Number(id));

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPick, setLightboxPick] = useState(0);
  const [descOpen, setDescOpen] = useState(false);
  const [pincode, setPincode] = useState('');
  const [pincodeResult, setPincodeResult] = useState('');
  // Variant picker (product id 2 only). Ported from the source's `productVariantPick`/`variantCart`,
  // adapted to a screen-local qty map rather than the source's single shared `variantCart` object —
  // this app's `variantCart` (see VariantSheet.tsx/categories.tsx) was already screen-local before
  // this sync, so a Product-page-local map matches that existing precedent instead of introducing new
  // global state. See the implementation report for this judgment call.
  const [variantPick, setVariantPick] = useState(0);
  const [variantQtyMap, setVariantQtyMap] = useState<Record<number, number>>({});

  const similarProducts = useMemo(() => (product ? getSimilarProducts(product, cart, loggedIn) : []), [product, cart, loggedIn]);
  const alsoBought = useMemo(() => (product ? getAlsoBought(product, cart, loggedIn) : []), [product, cart, loggedIn]);
  const variantPacks = useMemo(() => (product ? buildVariantPacks(product) : []), [product]);

  if (!product) return <StubScreen title="Product detail" detail={`Product #${id}`} />;

  const hasVariants = product.id === 2;
  const gated = !!product.gated && !loggedIn; // never true for the current seed catalog
  const cartQty = cart[product.id] || 0;
  const inCart = cartQty > 0;
  const bulkTiers = bulkTiersFor(product);
  const description = productDescriptionFor(product);

  const goBack = () => router.back();
  const goReviews = () => router.push(`/product/${product.id}/reviews`);
  const goCart = () => router.push('/cart');
  const goAccount = () => router.push('/account');
  const goPolicies = () => flash('Full policy details coming soon');
  const playBrandVideo = () => flash('Playing brand video');

  const openProduct = (pid: number) => router.push(`/product/${pid}`);
  const addProduct = (pid: number) => {
    const p = productById(pid);
    addToCart(pid, 1);
    if (p) flash(addFlashLabel(p.name));
  };

  const checkPincode = () => {
    setPincodeResult(pincode && pincode.length >= 5 ? `Delivers by tomorrow, 6–9am to ${pincode}` : 'Enter a valid pincode');
  };

  const productAdd = () => {
    addToCart(product.id, 1);
    flash(addFlashLabel(product.name));
  };

  const selectedPack = variantPacks[variantPick];
  const selectedPackQty = variantQtyMap[variantPick] || 0;
  const variantHasDiscount = !!selectedPack && selectedPack.mrpBase > selectedPack.price;
  const variantDiscount = variantHasDiscount ? '-' + Math.round((1 - selectedPack.price / selectedPack.mrpBase) * 100) + '%' : '';

  const addVariant = () => {
    addToCart(product.id, selectedPack.mult);
    setVariantQtyMap((m) => ({ ...m, [variantPick]: 1 }));
    flash('Added to order');
  };
  const incVariant = () => {
    addToCart(product.id, selectedPack.mult);
    setVariantQtyMap((m) => ({ ...m, [variantPick]: (m[variantPick] || 0) + 1 }));
  };
  const decVariant = () => {
    addToCart(product.id, -selectedPack.mult);
    setVariantQtyMap((m) => ({ ...m, [variantPick]: Math.max(0, (m[variantPick] || 0) - 1) }));
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.headerRow, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={goBack} style={styles.backButton}>
            <SmallBackChevronIcon size={9} />
          </Pressable>
        </View>

        <View style={styles.photoCard}>
          <View style={styles.photoRow}>
            <Pressable onPress={() => setLightboxOpen(true)} style={styles.mainPhoto}>
              <Text style={styles.photoPlaceholder}>product photo</Text>
            </Pressable>
            <View style={styles.smallPhoto} />
          </View>
          <View style={styles.dotsRow}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.dot, { backgroundColor: i === 0 ? colors.brandGreen : colors.borderGray }]} />
            ))}
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.brand}>{product.brand}</Text>
          <Text style={styles.name}>{product.name}</Text>
          <Pressable onPress={goReviews} style={styles.ratingPill}>
            <StarIcon size={10} />
            <Text style={styles.ratingText}>4.6 (128)</Text>
            <ChevronRightIcon size={8} />
          </Pressable>

          {!gated ? (
            hasVariants ? (
              <View style={styles.pricingBlock}>
                <Text style={styles.sectionLabel}>Select Variant</Text>
                <View style={styles.variantGrid}>
                  {variantPacks.map((pack, i) => (
                    <Pressable
                      key={pack.key}
                      onPress={() => setVariantPick(i)}
                      style={[styles.variantOption, { borderColor: i === variantPick ? colors.brandGreen : 'rgba(0,0,0,.12)', backgroundColor: i === variantPick ? colors.mintTint : colors.white }]}
                    >
                      <Text style={styles.variantOptionLabel}>{i === 0 ? product.cs : i === 1 ? 'Bulk carton ×6' : 'Trial pack'}</Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.retailBlock}>
                  <Text style={styles.retailLabel}>Retail pricing</Text>
                  {variantHasDiscount ? (
                    <>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceGreen}>{money(selectedPack.price)}</Text>
                        <View style={styles.discountChip}>
                          <Text style={styles.discountChipText}>{variantDiscount}</Text>
                        </View>
                      </View>
                      <Text style={styles.compareText}>
                        MRP <Text style={styles.strike}>{money(selectedPack.mrpBase)}</Text> · for each
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.priceDark}>MRP {money(selectedPack.price)}</Text>
                      <Text style={styles.compareText}>for each</Text>
                    </>
                  )}

                  {selectedPackQty > 0 ? (
                    <View>
                      {variantHasDiscount && (
                        <View style={styles.discountBanner}>
                          <Text style={styles.discountBannerText}>
                            {variantDiscount} bulk discount applied for {selectedPackQty} units!
                          </Text>
                        </View>
                      )}
                      <View style={styles.stepperRow}>
                        <View style={styles.stepper}>
                          <Pressable onPress={decVariant} style={styles.stepTap} hitSlop={6}>
                            <Text style={styles.stepSymbol}>−</Text>
                          </Pressable>
                          <Text style={styles.stepQty}>{selectedPackQty}</Text>
                          <Pressable onPress={incVariant} style={styles.stepTap} hitSlop={6}>
                            <Text style={styles.stepSymbol}>+</Text>
                          </Pressable>
                        </View>
                        <Pressable onPress={goCart} style={styles.cartIconButton}>
                          <CartIcon size={16} color={colors.brandGreen} />
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Pressable onPress={addVariant} style={styles.addButton}>
                      <CartIcon size={14} color={colors.white} />
                      <Text style={styles.addButtonText}>Add to order</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.pricingBlock}>
                <Text style={styles.retailLabel}>Retail pricing</Text>
                {product.cmp ? (
                  <>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceGreen}>{money(product.price || 0)}</Text>
                      <View style={styles.discountChip}>
                        <Text style={styles.discountChipText}>{discountBadgeOrEmpty(product)}</Text>
                      </View>
                    </View>
                    <Text style={styles.compareText}>
                      MRP <Text style={styles.strike}>{money(product.cmp)}</Text> · for each
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.priceDark}>MRP {money(product.price || 0)}</Text>
                    <Text style={styles.compareText}>for each</Text>
                  </>
                )}

                {inCart ? (
                  <View>
                    {!!product.cmp && (
                      <View style={styles.discountBanner}>
                        <Text style={styles.discountBannerText}>
                          {discountBadgeOrEmpty(product)} bulk discount applied for {cartQty} units!
                        </Text>
                      </View>
                    )}
                    <View style={styles.stepperRow}>
                      <View style={styles.stepper}>
                        <Pressable onPress={() => dec(product.id)} style={styles.stepTap} hitSlop={6}>
                          <Text style={styles.stepSymbol}>−</Text>
                        </Pressable>
                        <Text style={styles.stepQty}>{cartQty}</Text>
                        <Pressable onPress={() => inc(product.id)} style={styles.stepTap} hitSlop={6}>
                          <Text style={styles.stepSymbol}>+</Text>
                        </Pressable>
                      </View>
                      <Pressable onPress={goCart} style={styles.cartIconButton}>
                        <CartIcon size={16} color={colors.brandGreen} />
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable onPress={productAdd} style={styles.addButton}>
                    <CartIcon size={14} color={colors.white} />
                    <Text style={styles.addButtonText}>Add to order</Text>
                  </Pressable>
                )}
              </View>
            )
          ) : (
            <Pressable onPress={goAccount} style={styles.gatedCard}>
              <Text style={styles.gatedText}>
                <Text style={styles.gatedLink}>Log in</Text> to view your trade price
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bulk Order Pricing</Text>
          <Text style={styles.cardSubtitle}>Tiered pricing for wholesale buying</Text>
          <View style={styles.tiersBox}>
            {bulkTiers.map((tier, i) => (
              <View key={tier.label} style={[styles.tierRow, i === bulkTiers.length - 1 && styles.tierRowLast]}>
                <Text style={styles.tierLabel}>{tier.label}</Text>
                <Text style={styles.tierPrice}>
                  {tier.price}
                  <Text style={styles.tierUnit}> /unit</Text>
                  {!!tier.off && <Text style={styles.tierOff}> {tier.off}</Text>}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.marginRow}>
            <Text style={styles.marginLabel}>Retailer margin</Text>
            <Text style={styles.marginValue}>{productMargin}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Estimated Delivery</Text>
          <Text style={styles.cardSubtitle}>Check availability and estimated arrival for your area</Text>
          <View style={styles.pincodeRow}>
            <View style={styles.pincodeInput}>
              <TextInput
                value={pincode}
                onChangeText={(t) => {
                  setPincode(t);
                  setPincodeResult('');
                }}
                placeholder="Enter pincode"
                placeholderTextColor={colors.bodyGray}
                style={styles.pincodeInputText}
                keyboardType="number-pad"
              />
            </View>
            <Pressable onPress={checkPincode} style={styles.checkButton}>
              <Text style={styles.checkButtonText}>Check</Text>
            </Pressable>
          </View>
          {!!pincodeResult && (
            <View style={styles.pincodeResultRow}>
              <Text style={styles.pincodeResultDot}>•</Text>
              <Text style={styles.pincodeResultText}>{pincodeResult}</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Product Description</Text>
          <View style={styles.descBlock}>
            <Text style={styles.descHeading}>Product Overview</Text>
            <Text style={styles.descBody} numberOfLines={descOpen ? undefined : 4}>
              {description}
            </Text>
            <Pressable onPress={() => setDescOpen((v) => !v)} style={styles.descToggle}>
              <Text style={styles.descToggleText}>{descOpen ? 'Show less' : 'Read More'}</Text>
              <View style={{ transform: [{ rotate: descOpen ? '180deg' : '0deg' }] }}>
                <ChevronDownIcon size={12} />
              </View>
            </Pressable>
          </View>
        </View>

        <View style={styles.shelfSection}>
          <Text style={styles.shelfTitle}>Similar products</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelfRow}>
            {similarProducts.map((p, i) => (
              <ProductCard
                key={`${p.id}-${i}`}
                variant="rail"
                priceMode="standard"
                product={p}
                onOpen={() => openProduct(p.id)}
                onAdd={() => addProduct(p.id)}
                onInc={() => inc(p.id)}
                onDec={() => dec(p.id)}
                onGoCart={goCart}
                onLogin={goAccount}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.shelfSection}>
          <Text style={styles.shelfTitle}>People also bought</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelfRow}>
            {alsoBought.map((p, i) => (
              <ProductCard
                key={`${p.id}-${i}`}
                variant="rail"
                priceMode="standard"
                product={p}
                onOpen={() => openProduct(p.id)}
                onAdd={() => addProduct(p.id)}
                onInc={() => inc(p.id)}
                onDec={() => dec(p.id)}
                onGoCart={goCart}
                onLogin={goAccount}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Policies</Text>
          <View style={styles.policyBlock}>
            <Text style={styles.policyHeading}>Return / Refund / Cancellation</Text>
            <Text style={styles.policyBody}>
              Eligible returns are accepted within 10 days of delivery for unused, unopened products in original packaging. Orders may be cancelled before dispatch, and
              approved refunds or replacements are processed after inspection.
            </Text>
            <Pressable onPress={goPolicies} style={styles.learnMore}>
              <Text style={styles.learnMoreText}>Learn more</Text>
              <ArrowRightIcon size={12} color={colors.brandGreen} />
            </Pressable>
          </View>
          <View style={styles.divider} />
          <View>
            <Text style={styles.policyHeading}>Shipping / Delivery</Text>
            <Text style={styles.policyBody}>
              Orders are generally delivered within 2–3 business days, with shipping charges shown at checkout. Free delivery may apply on eligible orders above ₹1,000,
              while liquid products or remote locations may take longer.
            </Text>
            <Pressable onPress={goPolicies} style={styles.learnMore}>
              <Text style={styles.learnMoreText}>Learn more</Text>
              <ArrowRightIcon size={12} color={colors.brandGreen} />
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.aboutBadge}>
            <Text style={styles.aboutBadgeText}>ABOUT US</Text>
          </View>
          <Text style={styles.aboutTitle}>{brandLegalName}</Text>
          <View style={styles.statsGrid}>
            {brandStats.map((s) => (
              <View key={s.label} style={styles.statBox}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.uspsRow}>
            {brandUsps.map((u) => (
              <View key={u} style={styles.uspPill}>
                <CheckThinIcon size={9} />
                <Text style={styles.uspText}>{u}</Text>
              </View>
            ))}
          </View>
          <View style={styles.divider} />
          <Text style={styles.policyHeading}>About {brandShort}</Text>
          <Text style={styles.policyBody}>{brandAbout}</Text>
          <Pressable onPress={goPolicies} style={styles.learnMore}>
            <Text style={styles.learnMoreText}>Learn more</Text>
            <ArrowRightIcon size={12} color={colors.brandGreen} />
          </Pressable>
          <Pressable onPress={playBrandVideo} style={styles.videoBox}>
            <Text style={styles.photoPlaceholder}>brand video</Text>
            <View style={styles.playButton}>
              <PlayIcon size={15} />
            </View>
          </Pressable>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {lightboxOpen && (
        <View style={styles.lightbox}>
          <Pressable onPress={() => setLightboxOpen(false)} style={styles.lightboxClose}>
            <CloseIcon size={14} color={colors.white} strokeWidth={2.2} />
          </Pressable>
          <View style={styles.lightboxPhoto}>
            <Text style={styles.photoPlaceholder}>product photo</Text>
          </View>
          <View style={styles.lightboxThumbs}>
            {[0, 1, 2, 3].map((i) => (
              <Pressable key={i} onPress={() => setLightboxPick(i)} style={[styles.lightboxThumb, { borderColor: lightboxPick === i ? colors.brandGreen : 'transparent' }]}>
                <Text style={styles.lightboxThumbText}>photo</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cardBg },
  scrollContent: { paddingBottom: 0 },
  headerRow: { paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  photoCard: { margin: 14, marginTop: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderGray, borderRadius: 18, padding: 16, paddingBottom: 12 },
  photoRow: { flexDirection: 'row', gap: 10 },
  mainPhoto: { flex: 4, height: 230, borderRadius: 14, backgroundColor: colors.cardBg, alignItems: 'center', justifyContent: 'center' },
  smallPhoto: { flex: 1, height: 230, borderRadius: 14, backgroundColor: colors.cardBg },
  photoPlaceholder: { fontFamily: fontFamily[500], fontSize: 11, color: 'rgba(0,0,0,.28)' },
  dotsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  infoCard: { margin: 14, marginTop: 0, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderGray, borderRadius: 18, padding: 16 },
  brand: { fontFamily: fontFamily[400], fontSize: 11, color: colors.bodyGray },
  name: { fontFamily: fontFamily[700], fontSize: 21, lineHeight: 26, color: colors.charcoal, marginTop: 4 },
  ratingPill: {
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderGray,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratingText: { fontFamily: fontFamily[600], fontSize: 10, color: colors.charcoal },
  pricingBlock: { marginTop: 18 },
  sectionLabel: { fontFamily: fontFamily[600], fontSize: 13, color: colors.charcoal },
  variantGrid: { flexDirection: 'row', gap: 8, marginTop: 9 },
  variantOption: { flex: 1, borderWidth: 1.6, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  variantOptionLabel: { fontFamily: fontFamily[700], fontSize: 13, lineHeight: 17, color: colors.charcoal, textAlign: 'center' },
  retailBlock: { marginTop: 16 },
  retailLabel: { fontFamily: fontFamily[600], fontSize: 12, color: colors.bodyGray, letterSpacing: 0.6, textTransform: 'uppercase' },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 8 },
  priceGreen: { fontFamily: fontFamily[700], fontSize: 22, color: colors.brandGreen, letterSpacing: -0.2 },
  priceDark: { fontFamily: fontFamily[700], fontSize: 22, color: colors.charcoal, letterSpacing: -0.2, marginTop: 8 },
  discountChip: { backgroundColor: colors.mintTint, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  discountChipText: { fontFamily: fontFamily[600], fontSize: 11, color: colors.brandGreen },
  compareText: { fontFamily: fontFamily[400], fontSize: 12, color: colors.bodyGray, marginTop: 4 },
  strike: { textDecorationLine: 'line-through' },
  discountBanner: { marginTop: 12, backgroundColor: colors.mintTint, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  discountBannerText: { fontFamily: fontFamily[600], fontSize: 12, color: colors.forestGreen },
  stepperRow: { marginTop: 10, flexDirection: 'row', gap: 7 },
  stepper: { flex: 1, height: 46, borderRadius: 12, backgroundColor: colors.brandGreen, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6 },
  stepTap: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  stepSymbol: { fontFamily: fontFamily[700], fontSize: 18, color: colors.white },
  stepQty: { fontFamily: fontFamily[700], fontSize: 14, color: colors.white },
  cartIconButton: { flexShrink: 0, width: 46, height: 46, borderRadius: 12, borderWidth: 1.6, borderColor: colors.brandGreen, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  addButton: { marginTop: 13, height: 46, borderRadius: 12, backgroundColor: colors.brandGreen, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addButtonText: { fontFamily: fontFamily[600], fontSize: 13, color: colors.white },
  gatedCard: { marginTop: 16, borderWidth: 1.5, borderColor: colors.brandGreen, borderStyle: 'dashed', borderRadius: 12, padding: 13, alignItems: 'center' },
  gatedText: { fontFamily: fontFamily[400], fontSize: 12, color: colors.bodyGray, textAlign: 'center' },
  gatedLink: { color: colors.brandGreen, fontFamily: fontFamily[700] },
  card: { margin: 14, marginTop: 0, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderGray, borderRadius: 18, padding: 16 },
  cardTitle: { fontFamily: fontFamily[700], fontSize: 18, color: colors.charcoal, letterSpacing: -0.2 },
  cardSubtitle: { fontFamily: fontFamily[400], fontSize: 11.5, color: colors.bodyGray, marginTop: 3 },
  tiersBox: { marginTop: 13, backgroundColor: colors.cardBg, borderRadius: 14, paddingHorizontal: 12 },
  tierRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.borderGray },
  tierRowLast: { borderBottomWidth: 0 },
  tierLabel: { fontFamily: fontFamily[400], fontSize: 12, color: colors.bodyGray },
  tierPrice: { fontFamily: fontFamily[700], fontSize: 13.5, color: colors.charcoal },
  tierUnit: { fontFamily: fontFamily[400], fontSize: 11, color: colors.bodyGray },
  tierOff: { fontFamily: fontFamily[600], fontSize: 11, color: colors.brandGreen },
  marginRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  marginLabel: { fontFamily: fontFamily[400], fontSize: 12.5, color: colors.bodyGray },
  marginValue: { fontFamily: fontFamily[700], fontSize: 13, color: colors.brandGreen },
  pincodeRow: { flexDirection: 'row', gap: 8, marginTop: 13 },
  pincodeInput: { flex: 1, justifyContent: 'center', backgroundColor: colors.cardBg, borderRadius: 14, paddingHorizontal: 13, height: 48 },
  pincodeInputText: { fontFamily: fontFamily[400], fontSize: 13, color: colors.charcoal, padding: 0 },
  checkButton: { flexShrink: 0, height: 48, paddingHorizontal: 18, borderRadius: 12, backgroundColor: colors.brandGreen, alignItems: 'center', justifyContent: 'center' },
  checkButtonText: { fontFamily: fontFamily[600], fontSize: 12.5, color: colors.white },
  pincodeResultRow: { flexDirection: 'row', gap: 8, marginTop: 11 },
  pincodeResultDot: { color: colors.brandGreen },
  pincodeResultText: { flex: 1, fontFamily: fontFamily[400], fontSize: 11.5, lineHeight: 17, color: colors.bodyGray },
  descBlock: { marginTop: 13 },
  descHeading: { fontFamily: fontFamily[600], fontSize: 13, color: colors.charcoal },
  descBody: { fontFamily: fontFamily[400], fontSize: 12.5, lineHeight: 20.6, color: colors.bodyGray, marginTop: 6 },
  descToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9 },
  descToggleText: { fontFamily: fontFamily[600], fontSize: 12, color: colors.brandGreen },
  shelfSection: { paddingTop: 6, paddingBottom: 2 },
  shelfTitle: { fontFamily: fontFamily[700], fontSize: 19, color: colors.charcoal, paddingHorizontal: 14 },
  shelfRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingTop: 12 },
  policyBlock: {},
  policyHeading: { fontFamily: fontFamily[600], fontSize: 13, color: colors.charcoal },
  policyBody: { fontFamily: fontFamily[400], fontSize: 12.5, lineHeight: 20.6, color: colors.bodyGray, marginTop: 6 },
  learnMore: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9 },
  learnMoreText: { fontFamily: fontFamily[600], fontSize: 12, color: colors.brandGreen },
  divider: { height: 1, backgroundColor: colors.borderGray, marginVertical: 16 },
  aboutBadge: { alignSelf: 'flex-start', backgroundColor: colors.mintTint, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  aboutBadgeText: { fontFamily: fontFamily[600], fontSize: 10, color: colors.forestGreen, letterSpacing: 0.6 },
  aboutTitle: { fontFamily: fontFamily[700], fontSize: 18, color: colors.charcoal, marginTop: 10, letterSpacing: -0.2 },
  statsGrid: { flexDirection: 'row', gap: 8, marginTop: 14 },
  statBox: { flex: 1, backgroundColor: colors.cardBg, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 6, alignItems: 'center' },
  statValue: { fontFamily: fontFamily[700], fontSize: 16, color: colors.brandGreen },
  statLabel: { fontFamily: fontFamily[400], fontSize: 10, color: colors.bodyGray, marginTop: 2 },
  uspsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  uspPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.cardBg, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  uspText: { fontFamily: fontFamily[600], fontSize: 10.5, color: colors.forestGreen },
  videoBox: { marginTop: 13, height: 150, borderRadius: 14, backgroundColor: colors.cardBg, alignItems: 'center', justifyContent: 'center' },
  playButton: { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brandGreen, alignItems: 'center', justifyContent: 'center' },
  bottomSpacer: { height: 24 },
  lightbox: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  lightboxClose: { position: 'absolute', top: 60, right: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,.7)', alignItems: 'center', justifyContent: 'center' },
  lightboxPhoto: { width: '86%', height: 340, borderRadius: 4, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  lightboxThumbs: { flexDirection: 'row', gap: 8, marginTop: 16 },
  lightboxThumb: { width: 56, height: 56, borderRadius: 6, backgroundColor: colors.white, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  lightboxThumbText: { fontFamily: fontFamily[500], fontSize: 7, color: 'rgba(0,0,0,.22)' },
});
