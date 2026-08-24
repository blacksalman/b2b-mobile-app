import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ds, dsElevation, dsFontFamily, dsRadii, dsSpacing, dsType } from '@/theme';
import {
  AyushLicenseIcon,
  CartIcon,
  CheckThinIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
  EasyReturnsIcon,
  GenuineCheckIcon,
  GstInvoiceIcon,
  HeartIcon,
  PlayIcon,
  SmallBackChevronIcon,
  StarIcon,
  TrashIcon,
} from '@/icons';
import { DsProductCard } from '@/components/ds/DsProductCard';
import { buildVariantPacks } from '@/components/shell/VariantSheet';
import { discountBadgeOrEmpty } from '@/data/decorateProduct';
import { productById } from '@/data/products';
import {
  brandAbout,
  brandLegalName,
  brandStats,
  brandUsps,
  bulkTiersFor,
  getAlsoBought,
  getSimilarProducts,
  productDescriptionFor,
  productSpecsFor,
} from '@/data/product-detail-content';
import { money } from '@/utils/money';
import { useAppState } from '@/state/AppStateContext';
import { StubScreen } from '@/components/shell/StubScreen';

const TRUST_BADGES = [
  { name: 'GST Invoice', Icon: GstInvoiceIcon },
  { name: 'Genuine Product', Icon: GenuineCheckIcon },
  { name: 'Easy Returns', Icon: EasyReturnsIcon },
  { name: 'AYUSH Licensed', Icon: AyushLicenseIcon },
] as const;

const PRODUCT_TABS = ['Description', 'Specifications', 'Reviews'] as const;
type ProductTab = (typeof PRODUCT_TABS)[number];

function addFlashLabel(name: string): string {
  return name.split(' ').slice(0, 2).join(' ') + ' added';
}

// Rebuilt against the new AyurvedaOne design system (Various Mobile App - Phone.dc.html, `isProduct`
// block + the global `showAddBar` sticky footer, which the new source renders OUTSIDE any per-screen
// sc-if — implemented here as a screen-local footer, matching this app's existing Checkout-screen
// pattern, since editing the shared `(tabs)/_layout.tsx` shell is out of scope this round). See the
// implementation report for the one known interaction this creates with the still-unmigrated
// MiniCartFab.
export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cart, loggedIn, addToCart, inc, dec, flash } = useAppState();

  const product = productById(Number(id));

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPick, setLightboxPick] = useState(0);
  const [wishlisted, setWishlisted] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const [productTab, setProductTab] = useState<ProductTab>('Description');
  const [pincode, setPincode] = useState('');
  const [pincodeResult, setPincodeResult] = useState('');
  const [pendingQty, setPendingQty] = useState(2);
  // Variant picker (product id 2 only) — screen-local, matching the pre-existing precedent in this
  // app (VariantSheet/Categories already keep `variantCart` screen-local, not global).
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
  const specs = productSpecsFor(product);
  const description = productDescriptionFor(product);

  const goBack = () => router.back();
  const goReviews = () => router.push(`/product/${product.id}/reviews`);
  const goCart = () => router.push('/cart');
  const goAccount = () => router.push('/account');
  const openReturnPolicy = () => flash('Full policy details coming soon');
  const openShippingPolicy = () => flash('Full policy details coming soon');
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

  // Ported verbatim from the source's `productAdd` (Various Mobile App - Phone.dc.html line 3066,
  // which — as a later duplicate JS object key — overrides an earlier, simpler definition at line
  // 3015 that would have flashed a confirmation). The winning definition adds `pendingQty` units
  // (minimum 2) and resets the stepper, but calls no `flash()` — so unlike every other add-to-cart
  // action in this app, tapping "Add to Cart" here shows no toast. Preserved exactly, not "fixed".
  const productAdd = () => {
    addToCart(product.id, Math.max(pendingQty, 2));
    setPendingQty(2);
  };

  const selectedPack = variantPacks[variantPick];
  const variantHasDiscount = !!selectedPack && selectedPack.mrpBase > selectedPack.price;
  const variantDiscount = variantHasDiscount ? '-' + Math.round((1 - selectedPack.price / selectedPack.mrpBase) * 100) + '%' : '';
  const selectedVariantQty = variantQtyMap[variantPick] || 0;

  // `productVariantInc`/`productVariantDec` ported verbatim from the source (line 3092/3094) — real,
  // working handlers. `productVariantAdd` (line 3090) is defined in the source but never wired to any
  // element in its own markup, so the stepper they control can never actually appear from a cold
  // start; kept here for parity rather than invented, but genuinely unreachable, same as Search's
  // dead voice-search panel from an earlier round.
  const incVariant = () => {
    addToCart(product.id, selectedPack.mult);
    setVariantQtyMap((m) => ({ ...m, [variantPick]: (m[variantPick] || 0) + 1 }));
  };
  const decVariant = () => {
    addToCart(product.id, -selectedPack.mult);
    setVariantQtyMap((m) => ({ ...m, [variantPick]: Math.max(0, (m[variantPick] || 0) - 1) }));
  };

  const barQty = inCart ? cartQty : Math.max(pendingQty, 2);
  const productLineTotal = money((product.price || 0) * barQty);
  const productLineMrp = money((product.cmp || 0) * barQty);
  const productSave = discountBadgeOrEmpty(product);
  const hasOffer = !!product.cmp;

  const lightboxThumbs = [0, 1, 2, 3];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.headerRow, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={goBack} style={styles.backButton} hitSlop={4}>
            <SmallBackChevronIcon size={9} color={ds.ink} />
          </Pressable>
        </View>

        <View style={styles.photoWrap}>
          <Pressable onPress={() => setLightboxOpen(true)} style={styles.photo} />
          <Pressable onPress={() => setWishlisted((v) => !v)} style={styles.wishlistButton} hitSlop={4}>
            <HeartIcon size={16} color={ds.primaryInk} fill={wishlisted ? ds.primaryInk : 'none'} />
          </Pressable>
          <View style={styles.dotsRow}>
            {lightboxThumbs.map((i) => (
              <View key={i} style={[styles.dot, { backgroundColor: lightboxPick === i ? ds.primaryInk : 'rgba(12,71,51,.28)' }]} />
            ))}
          </View>
        </View>
        <View style={styles.thumbRow}>
          {lightboxThumbs.map((i) => (
            <Pressable key={i} onPress={() => setLightboxPick(i)} style={[styles.thumb, { borderColor: lightboxPick === i ? ds.primary : 'transparent' }]} />
          ))}
        </View>

        <View style={styles.infoBlock}>
          <View style={styles.infoTopRow}>
            <Text style={styles.brand} numberOfLines={1}>{product.brand}</Text>
            <Pressable onPress={goReviews} style={styles.ratingPill} hitSlop={4}>
              <Text style={styles.ratingStar}>★</Text>
              <Text style={styles.ratingValue}>4.6</Text>
              <Text style={styles.ratingCount}>(128 reviews)</Text>
              <ChevronRightIcon size={12} color={ds.ink2} strokeWidth={2.2} />
            </Pressable>
          </View>
          <Text style={styles.name}>{product.name}</Text>

          {!gated && (
            <>
              {hasVariants ? (
                <>
                  <View style={styles.divider} />
                  <View style={styles.variantGrid}>
                    {variantPacks.map((pack, i) => (
                      <Pressable
                        key={pack.key}
                        onPress={() => setVariantPick(i)}
                        style={[styles.variantOption, { borderColor: i === variantPick ? ds.primary : ds.line, backgroundColor: i === variantPick ? ds.primarySoft : ds.surface }]}
                      >
                        <Text style={styles.variantOptionLabel}>{i === 0 ? product.cs : i === 1 ? 'Bulk carton ×6' : 'Trial pack'}</Text>
                        <Text style={styles.variantOptionPrice}>{money(pack.price)}</Text>
                      </Pressable>
                    ))}
                  </View>

                  {variantHasDiscount ? (
                    <View style={styles.priceRow}>
                      <Text style={styles.priceValue}>{money(selectedPack.price)}</Text>
                      <Text style={styles.priceCompare}>{money(selectedPack.mrpBase)}</Text>
                      <View style={styles.saveChip}>
                        <Text style={styles.saveChipText}>{variantDiscount}</Text>
                      </View>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.priceValueOnly}>{money(selectedPack.price)}</Text>
                      <Text style={styles.priceSubline}>MRP · per unit · excl. GST</Text>
                    </>
                  )}

                  {selectedVariantQty > 0 && (
                    <View>
                      {variantHasDiscount && (
                        <View style={styles.discountBanner}>
                          <Text style={styles.discountBannerText}>{variantDiscount} bulk rate applied on {selectedVariantQty} units</Text>
                        </View>
                      )}
                      <View style={styles.variantStepperRow}>
                        <View style={styles.variantStepper}>
                          <Pressable onPress={decVariant} style={styles.variantStepBtn} hitSlop={4}>
                            {selectedVariantQty <= 1 ? <TrashIcon size={14} color={ds.dangerInk} /> : <Text style={styles.stepGlyph}>−</Text>}
                          </Pressable>
                          <Text style={styles.stepQty}>{selectedVariantQty}</Text>
                          <Pressable onPress={incVariant} style={styles.variantStepBtn} hitSlop={4}>
                            <Text style={styles.stepGlyph}>+</Text>
                          </Pressable>
                        </View>
                        <Pressable onPress={goCart} style={styles.cartIconButton}>
                          <CartIcon size={18} color={ds.primaryInk} />
                        </Pressable>
                      </View>
                    </View>
                  )}
                </>
              ) : (
                <>
                  <View style={styles.divider} />
                  {hasOffer ? (
                    <>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceValue}>{money(product.price || 0)}</Text>
                        <Text style={styles.priceCompare}>{product.cmp ? money(product.cmp) : ''}</Text>
                        <View style={styles.saveChip}>
                          <Text style={styles.saveChipText}>{productSave}</Text>
                        </View>
                      </View>
                      <Text style={styles.priceSubline}>per unit · incl. trade discount · inclusive of GST</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.priceValueOnly}>{money(product.price || 0)}</Text>
                      <Text style={styles.priceSubline}>MRP · per unit · excl. GST</Text>
                    </>
                  )}
                </>
              )}

              <View style={styles.trustGrid}>
                {TRUST_BADGES.map(({ name, Icon }) => (
                  <View key={name} style={styles.trustItem}>
                    <View style={styles.trustIconTile}>
                      <Icon size={16} color={ds.primaryInk} />
                    </View>
                    <Text style={styles.trustLabel}>{name}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {gated && (
            <>
              <View style={styles.divider} />
              <Pressable onPress={goAccount} style={styles.gatedButton}>
                <Text style={styles.gatedButtonText}>Log in for price</Text>
              </Pressable>
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bulk pricing</Text>
          <View style={styles.tiersBox}>
            {bulkTiers.map((tier) => (
              <View key={tier.label} style={[styles.tierRow, { backgroundColor: tier.rowBg }]}>
                <Text style={[styles.tierLabel, { color: tier.labelColor }]}>{tier.label}</Text>
                <Text style={[styles.tierPrice, { color: tier.labelColor }]}>{tier.price}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.minQtyRow}>
          <Text style={styles.minQtyLabel}>Minimum order qty: 2 units</Text>
          <View style={styles.pendingStepper}>
            <Pressable onPress={() => setPendingQty((q) => Math.max(q - 1, 2))} style={styles.pendingStepBtn} hitSlop={4}>
              <Text style={styles.pendingStepGlyph}>−</Text>
            </Pressable>
            <Text style={styles.pendingQtyText}>{pendingQty}</Text>
            <Pressable onPress={() => setPendingQty((q) => q + 1)} style={styles.pendingStepBtn} hitSlop={4}>
              <Text style={styles.pendingStepGlyph}>+</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionHeaderBlock}>
          <Text style={styles.sectionTitle}>Estimated delivery</Text>
          <Text style={styles.sectionSubtitle}>Check availability for your area</Text>
        </View>
        <View style={styles.pincodeSection}>
          <View style={styles.pincodeRow}>
            <View style={styles.pincodeInput}>
              <TextInput
                value={pincode}
                onChangeText={(t) => {
                  setPincode(t);
                  setPincodeResult('');
                }}
                placeholder="Enter pincode"
                placeholderTextColor={ds.ink2}
                style={styles.pincodeInputText}
                keyboardType="number-pad"
              />
            </View>
            <Pressable onPress={checkPincode} style={styles.checkButton}>
              <Text style={styles.checkButtonText}>Check</Text>
            </Pressable>
          </View>
          {!!pincodeResult && (
            <View style={styles.pincodeResult}>
              <Text style={styles.pincodeResultText}>{pincodeResult}</Text>
            </View>
          )}
        </View>

        <View style={styles.tabsSection}>
          <View style={styles.tabsRow}>
            {PRODUCT_TABS.map((tab) => {
              const active = productTab === tab;
              return (
                <Pressable key={tab} onPress={() => setProductTab(tab)} style={[styles.tab, { borderBottomColor: active ? ds.primaryInk : 'transparent' }]}>
                  <Text style={[styles.tabText, { color: active ? ds.primaryInk : ds.ink2 }]}>{tab}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.tabCard}>
          {productTab === 'Description' && (
            <View>
              <Text style={styles.descBody} numberOfLines={descOpen ? undefined : 4}>
                {description}
              </Text>
              <Pressable onPress={() => setDescOpen((v) => !v)} style={styles.descToggle}>
                <Text style={styles.descToggleText}>{descOpen ? 'Show less' : 'Read More'}</Text>
                <View style={{ transform: [{ rotate: descOpen ? '180deg' : '0deg' }] }}>
                  <ChevronDownIcon size={12} color={ds.primaryInk} />
                </View>
              </Pressable>
            </View>
          )}
          {productTab === 'Specifications' && (
            <View>
              {specs.map((sp, i) => (
                <View key={sp.k} style={[styles.specRow, i === specs.length - 1 && styles.specRowLast]}>
                  <Text style={styles.specKey}>{sp.k}</Text>
                  <Text style={styles.specValue}>{sp.v}</Text>
                </View>
              ))}
            </View>
          )}
          {productTab === 'Reviews' && (
            <View>
              <Pressable onPress={goReviews} style={styles.reviewsSummaryRow}>
                <View style={styles.reviewsSummaryLeft}>
                  <Text style={styles.reviewsAvg}>4.6</Text>
                  <View>
                    <Text style={styles.reviewsStars}>★★★★★</Text>
                    <Text style={styles.reviewsCount}>128 reviews</Text>
                  </View>
                </View>
                <ChevronRightIcon size={14} color={ds.ink2} strokeWidth={2.2} />
              </Pressable>
              <View style={styles.reviewPreviewList}>
                {[
                  { initials: 'AR', name: 'Anita R.', stars: 5, date: '2 weeks ago', text: 'Consistent batch quality every order. Our clinic has switched fully to this supplier.' },
                  { initials: 'KM', name: 'Karan M.', stars: 5, date: '1 month ago', text: 'Fast dispatch and the packaging is always tamper-proof. Very reliable for repeat orders.' },
                ].map((r) => (
                  <View key={r.name} style={styles.reviewPreviewCard}>
                    <View style={styles.reviewPreviewHeader}>
                      <View style={styles.reviewAvatar}>
                        <Text style={styles.reviewAvatarText}>{r.initials}</Text>
                      </View>
                      <View style={styles.reviewMeta}>
                        <Text style={styles.reviewerName}>{r.name}</Text>
                        <Text style={styles.reviewDate}>{r.date}</Text>
                      </View>
                      <View style={styles.reviewStarsChip}>
                        <StarIcon size={10} />
                        <Text style={styles.reviewStarsChipText}>{r.stars}</Text>
                      </View>
                    </View>
                    <Text style={styles.reviewPreviewText}>{r.text}</Text>
                  </View>
                ))}
              </View>
              <Pressable onPress={goReviews} style={styles.viewAllReviewsButton}>
                <Text style={styles.viewAllReviewsText}>View all reviews</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.sectionHeaderBlock}>
          <Text style={styles.sectionTitle}>Similar products</Text>
          <Text style={styles.sectionSubtitle}>Same category, comparable margin</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelfRow}>
          {similarProducts.map((p, i) => (
            <DsProductCard
              key={`${p.id}-${i}`}
              product={p}
              width={166}
              onOpen={() => openProduct(p.id)}
              onAdd={() => addProduct(p.id)}
              onInc={() => inc(p.id)}
              onDec={() => dec(p.id)}
              onLogin={goAccount}
            />
          ))}
        </ScrollView>

        <View style={styles.sectionHeaderBlock}>
          <Text style={styles.sectionTitle}>People also bought</Text>
          <Text style={styles.sectionSubtitle}>Frequently ordered together</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelfRow}>
          {alsoBought.map((p, i) => (
            <DsProductCard
              key={`${p.id}-${i}`}
              product={p}
              width={166}
              onOpen={() => openProduct(p.id)}
              onAdd={() => addProduct(p.id)}
              onInc={() => inc(p.id)}
              onDec={() => dec(p.id)}
              onLogin={goAccount}
            />
          ))}
        </ScrollView>

        <View style={styles.sectionHeaderBlock}>
          <Text style={styles.sectionTitle}>Policies</Text>
          <Text style={styles.sectionSubtitle}>Returns, refunds and delivery terms</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.policyHeading}>Return, refund &amp; cancellation</Text>
          <Text style={styles.policyBody}>
            Eligible returns accepted within 10 days of delivery for unused, unopened products in original packaging. Orders may be cancelled before dispatch.
          </Text>
          <Pressable onPress={openReturnPolicy} style={styles.learnMore}>
            <Text style={styles.learnMoreText}>Learn more</Text>
            <ChevronRightIcon size={12} color={ds.primaryInk} strokeWidth={2.2} />
          </Pressable>
          <View style={styles.divider} />
          <Text style={styles.policyHeading}>Shipping &amp; delivery</Text>
          <Text style={styles.policyBody}>
            Delivered within 2–3 business days, shipping shown at checkout. Free delivery on eligible orders above ₹5,000.
          </Text>
          <Pressable onPress={openShippingPolicy} style={styles.learnMore}>
            <Text style={styles.learnMoreText}>Learn more</Text>
            <ChevronRightIcon size={12} color={ds.primaryInk} strokeWidth={2.2} />
          </Pressable>
        </View>

        <View style={styles.sectionHeaderBlock}>
          <Text style={styles.sectionTitle}>About the manufacturer</Text>
          <Text style={styles.sectionSubtitle}>Who makes this product</Text>
        </View>
        <View style={styles.card}>
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
                <CheckThinIcon size={10} color={ds.primaryInk} />
                <Text style={styles.uspText}>{u}</Text>
              </View>
            ))}
          </View>
          <View style={styles.divider} />
          <Text style={styles.policyBody}>{brandAbout}</Text>
          <Pressable onPress={playBrandVideo} style={styles.videoBox}>
            <View style={styles.playButton}>
              <PlayIcon size={16} color={ds.surface} />
            </View>
          </Pressable>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={[styles.addBar, { paddingBottom: 12 + insets.bottom }]}>
        <View style={styles.addBarInfo}>
          <View style={styles.addBarTotalRow}>
            <Text style={styles.addBarTotal}>{productLineTotal}</Text>
            {hasOffer && (
              <>
                <Text style={styles.addBarMrp}>{productLineMrp}</Text>
                <View style={styles.saveChip}>
                  <Text style={styles.saveChipText}>{productSave}</Text>
                </View>
              </>
            )}
          </View>
        </View>
        {inCart ? (
          <View style={styles.addBarStepper}>
            <Pressable onPress={() => dec(product.id)} style={styles.addBarStepBtn} hitSlop={4}>
              {cartQty <= 1 ? <TrashIcon size={14} color={ds.dangerInk} /> : <Text style={styles.stepGlyph}>−</Text>}
            </Pressable>
            <Text style={styles.stepQty}>{cartQty}</Text>
            <Pressable onPress={() => inc(product.id)} style={styles.addBarStepBtn} hitSlop={4}>
              <Text style={styles.stepGlyph}>+</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={productAdd} style={styles.addBarButton}>
            <CartIcon size={14} color={ds.surface} />
            <Text style={styles.addBarButtonText}>Add to Cart</Text>
          </Pressable>
        )}
      </View>

      {lightboxOpen && (
        <View style={[styles.lightbox, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={() => setLightboxOpen(false)} style={[styles.lightboxClose, { top: insets.top + 12 }]}>
            <CloseIcon size={14} color={ds.ink} strokeWidth={2.2} />
          </Pressable>
          <View style={styles.lightboxPhoto} />
          <View style={styles.lightboxThumbs}>
            {lightboxThumbs.map((i) => (
              <Pressable key={i} onPress={() => setLightboxPick(i)} style={[styles.lightboxThumb, { borderColor: lightboxPick === i ? ds.primary : 'transparent' }]} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ds.canvas },
  scrollContent: { paddingBottom: 0 },
  headerRow: { flexShrink: 0, paddingHorizontal: dsSpacing.lg, paddingBottom: dsSpacing.md, backgroundColor: ds.surface, borderBottomWidth: 1, borderBottomColor: ds.line, flexDirection: 'row', alignItems: 'center', gap: dsSpacing.md },
  backButton: { width: 40, height: 40, borderRadius: dsRadii.pill, backgroundColor: ds.canvas, alignItems: 'center', justifyContent: 'center' },

  photoWrap: { position: 'relative' },
  photo: { aspectRatio: 4 / 3, backgroundColor: ds.primarySoft },
  wishlistButton: { position: 'absolute', top: 12, right: dsSpacing.lg, width: 36, height: 36, borderRadius: dsRadii.pill, backgroundColor: ds.surface, boxShadow: '0 1px 2px rgba(12,71,51,.12)', alignItems: 'center', justifyContent: 'center' },
  dotsRow: { position: 'absolute', left: 0, right: 0, bottom: dsSpacing.md, flexDirection: 'row', justifyContent: 'center', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: dsRadii.pill },
  thumbRow: { flexDirection: 'row', gap: dsSpacing.sm, paddingHorizontal: dsSpacing.lg, paddingTop: dsSpacing.sm, maxWidth: 280 },
  thumb: { flex: 1, aspectRatio: 1, borderRadius: dsRadii.input, backgroundColor: ds.canvas, borderWidth: 1.5 },

  infoBlock: { marginTop: dsSpacing.md, paddingHorizontal: dsSpacing.lg },
  infoTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: dsSpacing.md },
  brand: { flexShrink: 1, ...dsType.meta },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingStar: { fontFamily: dsFontFamily[400], fontSize: 14, lineHeight: 21, color: ds.star },
  ratingValue: { fontFamily: dsFontFamily[600], fontSize: 11, lineHeight: 14, letterSpacing: 0.22, color: ds.ink },
  ratingCount: { ...dsType.meta },
  name: { ...dsType.h1, marginTop: 4 },
  divider: { height: 1, backgroundColor: ds.line, marginVertical: dsSpacing.md },

  variantGrid: { flexDirection: 'row', gap: dsSpacing.sm, marginTop: dsSpacing.md },
  variantOption: { flex: 1, borderRadius: dsRadii.button, borderWidth: 1.5, paddingVertical: dsSpacing.md, paddingHorizontal: dsSpacing.sm, alignItems: 'center' },
  variantOptionLabel: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink, textAlign: 'center' },
  variantOptionPrice: { fontFamily: dsFontFamily[700], fontSize: 14, lineHeight: 20, color: ds.primaryInk, marginTop: 4 },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: dsSpacing.sm, marginTop: dsSpacing.md },
  priceValue: { fontFamily: dsFontFamily[700], fontSize: 18, lineHeight: 24, color: ds.primaryInk },
  priceValueOnly: { fontFamily: dsFontFamily[700], fontSize: 18, lineHeight: 24, color: ds.primaryInk, marginTop: dsSpacing.md },
  priceCompare: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink3, textDecorationLine: 'line-through' },
  priceSubline: { ...dsType.meta, marginTop: 4 },
  saveChip: { backgroundColor: ds.accentSoft, borderRadius: dsRadii.chip, paddingHorizontal: dsSpacing.sm, paddingVertical: 4 },
  saveChipText: { fontFamily: dsFontFamily[600], fontSize: 11, lineHeight: 14, letterSpacing: 0.22, color: '#A2620F' },

  discountBanner: { marginTop: dsSpacing.md, backgroundColor: ds.accentSoft, borderRadius: dsRadii.input, paddingHorizontal: dsSpacing.md, paddingVertical: dsSpacing.sm },
  discountBannerText: { fontFamily: dsFontFamily[600], fontSize: 11, lineHeight: 14, letterSpacing: 0.22, color: ds.warningInk },
  variantStepperRow: { marginTop: dsSpacing.md, flexDirection: 'row', gap: dsSpacing.sm },
  variantStepper: { flex: 1, height: 48, borderRadius: dsRadii.button, backgroundColor: ds.primarySoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  variantStepBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepGlyph: { fontFamily: dsFontFamily[700], fontSize: 18, lineHeight: 24, color: ds.primaryInk },
  stepQty: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.primaryInk, minWidth: 24, textAlign: 'center' },
  cartIconButton: { flexShrink: 0, width: 48, height: 48, borderRadius: dsRadii.button, borderWidth: 1.5, borderColor: ds.primary, backgroundColor: ds.surface, alignItems: 'center', justifyContent: 'center' },

  trustGrid: { flexDirection: 'row', gap: dsSpacing.sm, marginTop: dsSpacing.lg, paddingVertical: dsSpacing.md, borderTopWidth: 1, borderTopColor: ds.line },
  trustItem: { flex: 1, alignItems: 'center', gap: 6 },
  trustIconTile: { width: 36, height: 36, borderRadius: dsRadii.pill, backgroundColor: ds.primarySoft, alignItems: 'center', justifyContent: 'center' },
  trustLabel: { fontFamily: dsFontFamily[600], fontSize: 10, lineHeight: 13, color: ds.ink2, textAlign: 'center' },

  gatedButton: { height: 48, borderRadius: dsRadii.button, borderWidth: 1.5, borderColor: ds.primary, alignItems: 'center', justifyContent: 'center' },
  gatedButtonText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.primaryInk },

  card: { marginTop: dsSpacing.md, marginHorizontal: dsSpacing.lg, backgroundColor: ds.surface, borderWidth: 1, borderColor: ds.line, borderRadius: dsRadii.button, padding: dsSpacing.md, ...dsElevation.e1 },
  cardTitle: { fontFamily: dsFontFamily[600], fontSize: 13, lineHeight: 18, color: ds.ink },
  tiersBox: { flexDirection: 'column', marginTop: dsSpacing.sm },
  tierRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: dsSpacing.md, padding: dsSpacing.md, borderTopWidth: 1, borderTopColor: ds.line },
  tierLabel: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20 },
  tierPrice: { fontFamily: dsFontFamily[700], fontSize: 14, lineHeight: 20 },

  minQtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: dsSpacing.md, marginTop: dsSpacing.md, paddingHorizontal: dsSpacing.lg },
  minQtyLabel: { ...dsType.meta },
  pendingStepper: { flexDirection: 'row', alignItems: 'center', height: 40, borderRadius: dsRadii.button, backgroundColor: ds.primarySoft },
  pendingStepBtn: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  pendingStepGlyph: { fontFamily: dsFontFamily[700], fontSize: 18, lineHeight: 24, color: ds.primaryInk },
  pendingQtyText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.primaryInk, minWidth: 24, textAlign: 'center' },

  sectionHeaderBlock: { paddingHorizontal: dsSpacing.lg, paddingTop: dsSpacing.xl },
  sectionTitle: { ...dsType.h3 },
  sectionSubtitle: { ...dsType.meta, marginTop: 4 },

  pincodeSection: { marginTop: dsSpacing.md, paddingHorizontal: dsSpacing.lg },
  pincodeRow: { flexDirection: 'row', gap: dsSpacing.sm },
  pincodeInput: { flex: 1, justifyContent: 'center', height: 48, borderWidth: 1, borderColor: ds.lineStrong, borderRadius: dsRadii.input, paddingHorizontal: dsSpacing.md },
  pincodeInputText: { ...dsType.body, padding: 0 },
  checkButton: { flexShrink: 0, height: 48, paddingHorizontal: dsSpacing.lg, borderRadius: dsRadii.button, backgroundColor: ds.primaryStrong, alignItems: 'center', justifyContent: 'center' },
  checkButtonText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.surface },
  pincodeResult: { marginTop: dsSpacing.md, backgroundColor: ds.primarySoft, borderRadius: dsRadii.input, padding: dsSpacing.md },
  pincodeResultText: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.primaryInk },

  tabsSection: { paddingHorizontal: dsSpacing.lg, paddingTop: dsSpacing.xl },
  tabsRow: { flexDirection: 'row', gap: dsSpacing.lg, borderBottomWidth: 1, borderBottomColor: ds.line },
  tab: { paddingBottom: dsSpacing.md, borderBottomWidth: 2 },
  tabText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20 },
  tabCard: { marginTop: dsSpacing.md, marginHorizontal: dsSpacing.lg, backgroundColor: ds.surface, borderWidth: 1, borderColor: ds.line, borderRadius: dsRadii.button, padding: dsSpacing.md, ...dsElevation.e1 },

  descBody: { ...dsType.body, color: ds.ink2 },
  descToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: dsSpacing.md },
  descToggleText: { fontFamily: dsFontFamily[600], fontSize: 13, lineHeight: 18, color: ds.primaryInk },

  specRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: dsSpacing.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: ds.line },
  specRowLast: { borderBottomWidth: 0 },
  specKey: { ...dsType.meta },
  specValue: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink, textAlign: 'right' },

  reviewsSummaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: dsSpacing.md },
  reviewsSummaryLeft: { flexDirection: 'row', alignItems: 'center', gap: dsSpacing.sm },
  reviewsAvg: { ...dsType.h1 },
  reviewsStars: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.star },
  reviewsCount: { ...dsType.meta, marginTop: 2 },
  reviewPreviewList: { gap: dsSpacing.sm, marginTop: dsSpacing.md },
  reviewPreviewCard: { backgroundColor: ds.surface, borderWidth: 1, borderColor: ds.line, borderRadius: dsRadii.sheet, padding: dsSpacing.md },
  reviewPreviewHeader: { flexDirection: 'row', alignItems: 'center', gap: dsSpacing.sm },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: ds.primarySoft, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  reviewAvatarText: { fontFamily: dsFontFamily[600], fontSize: 13, lineHeight: 18, color: ds.primaryInk },
  reviewMeta: { flex: 1, minWidth: 0 },
  reviewerName: { fontFamily: dsFontFamily[600], fontSize: 13, lineHeight: 18, color: ds.ink },
  reviewDate: { ...dsType.meta },
  reviewStarsChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ds.canvas, borderRadius: dsRadii.input, paddingHorizontal: dsSpacing.sm, paddingVertical: 4 },
  reviewStarsChipText: { fontFamily: dsFontFamily[600], fontSize: 11, lineHeight: 14, color: ds.ink },
  reviewPreviewText: { ...dsType.meta, marginTop: dsSpacing.sm },
  viewAllReviewsButton: { height: 40, borderRadius: dsRadii.button, borderWidth: 1.5, borderColor: ds.primary, alignItems: 'center', justifyContent: 'center', marginTop: dsSpacing.md },
  viewAllReviewsText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.primaryInk },

  shelfRow: { flexDirection: 'row', gap: dsSpacing.md, paddingHorizontal: dsSpacing.lg, paddingTop: dsSpacing.md },

  policyHeading: { fontFamily: dsFontFamily[600], fontSize: 13, lineHeight: 18, color: ds.ink },
  policyBody: { ...dsType.body, color: ds.ink2, marginTop: 4 },
  learnMore: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: dsSpacing.sm },
  learnMoreText: { fontFamily: dsFontFamily[600], fontSize: 13, lineHeight: 18, color: ds.primaryInk },

  aboutTitle: { ...dsType.h3 },
  statsGrid: { flexDirection: 'row', gap: dsSpacing.sm, marginTop: dsSpacing.md },
  statBox: { flex: 1, backgroundColor: ds.canvas, borderRadius: dsRadii.input, paddingVertical: dsSpacing.md, paddingHorizontal: dsSpacing.sm, alignItems: 'center' },
  statValue: { ...dsType.h2 },
  statLabel: { ...dsType.meta, marginTop: 4 },
  uspsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: dsSpacing.sm, marginTop: dsSpacing.md },
  uspPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ds.primarySoft, paddingHorizontal: dsSpacing.md, paddingVertical: dsSpacing.sm, borderRadius: dsRadii.pill },
  uspText: { fontFamily: dsFontFamily[600], fontSize: 11, lineHeight: 14, letterSpacing: 0.22, color: ds.primaryInk },
  videoBox: { position: 'relative', aspectRatio: 16 / 9, borderRadius: dsRadii.input, backgroundColor: ds.canvas, marginTop: dsSpacing.md, alignItems: 'center', justifyContent: 'center' },
  playButton: { position: 'absolute', width: 48, height: 48, borderRadius: dsRadii.pill, backgroundColor: ds.primaryStrong, alignItems: 'center', justifyContent: 'center' },

  bottomSpacer: { height: 88 },

  addBar: { flexShrink: 0, backgroundColor: ds.surface, borderTopWidth: 1, borderTopColor: ds.line, paddingHorizontal: dsSpacing.lg, paddingTop: dsSpacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: dsSpacing.md, ...dsElevation.e2 },
  addBarInfo: { minWidth: 0 },
  addBarTotalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  addBarTotal: { fontFamily: dsFontFamily[700], fontSize: 18, lineHeight: 24, letterSpacing: -0.18, color: ds.ink },
  addBarMrp: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink3, textDecorationLine: 'line-through' },
  addBarButton: { flexShrink: 0, maxWidth: 220, height: 48, paddingHorizontal: dsSpacing.lg, borderRadius: dsRadii.button, backgroundColor: ds.primaryStrong, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: dsSpacing.sm },
  addBarButtonText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.surface },
  addBarStepper: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', height: 48, borderRadius: dsRadii.button, backgroundColor: ds.primarySoft },
  addBarStepBtn: { width: 40, height: 48, alignItems: 'center', justifyContent: 'center' },

  lightbox: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(12,71,51,.45)', zIndex: 80, alignItems: 'center', justifyContent: 'center', paddingHorizontal: dsSpacing.lg, paddingBottom: dsSpacing.lg },
  lightboxClose: { position: 'absolute', right: dsSpacing.lg, width: 32, height: 32, borderRadius: dsRadii.button, backgroundColor: ds.surface, alignItems: 'center', justifyContent: 'center' },
  lightboxPhoto: { width: '100%', aspectRatio: 1, borderRadius: dsRadii.button, backgroundColor: ds.surface },
  lightboxThumbs: { flexDirection: 'row', gap: dsSpacing.sm, marginTop: dsSpacing.md },
  lightboxThumb: { width: 56, height: 56, borderRadius: dsRadii.input, backgroundColor: ds.surface, borderWidth: 1.5 },
});
