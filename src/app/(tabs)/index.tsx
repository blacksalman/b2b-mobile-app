import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ds, dsFontFamily, dsRadii, dsSpacing, dsElevation } from '@/theme';
import { Header } from '@/components/shell/Header';
import { DsSectionHeader } from '@/components/ds/DsSectionHeader';
import { DsProductCard } from '@/components/ds/DsProductCard';
import { MarginTrendIcon, DeliveryBoxIcon, ShieldCheckIcon, ChevronRightIcon, ConcernLeafIcon, CartIcon, TrashIcon } from '@/icons';
import { useAppState } from '@/state/AppStateContext';
import {
  buyerReviews,
  doctorTalks,
  fastMoving,
  getBuyAgain,
  promoBanners,
} from '@/data/home-content';
import { productById, productIdsByCategory } from '@/data/products';
import { useHomeApiData, toRailProduct, type ApiCategoryTile, type ApiBrand } from '@/data/homeApi';
import { useApiCartActions } from '@/data/useApiCartActions';
import { productHref } from '@/data/idHash';

function addFlashLabel(name: string): string {
  return name.split(' ').slice(0, 2).join(' ') + ' added';
}

// Rebuilt against the new AyurvedaOne design system (Various Mobile App - Phone.dc.html, isHome
// block, line 40-452). Every section below is in the source's exact order; sections whose content
// is purely decorative/static in the source (the "Up to 63% profit margin" tier copy, the USP tile
// labels) are hardcoded here exactly as the source hardcodes them, not wired to any real tier logic
// — same fidelity approach as every previous screen in this app.
export default function HomeScreen() {
  const router = useRouter();
  const { cart, loggedIn, addToCart, inc, dec, flash } = useAppState();

  const buyAgain = useMemo(() => getBuyAgain(cart, loggedIn), [cart, loggedIn]);

  // Best sellers / New arrivals / Featured / Concern shelves / category tiles / brands / hero
  // banners are all backed by the real backend now (product-sections, category-sections,
  // collections, banners) - see useHomeApiData. Buy again and Fast-moving offers stay on
  // home-content.ts's mock data, deferred pending a decision with the doctor.
  const apiData = useHomeApiData();
  const bestSellers = useMemo(
    () => apiData.bestSellers.map((p) => toRailProduct(p, cart, loggedIn)),
    [apiData.bestSellers, cart, loggedIn]
  );
  const newArrivals = useMemo(
    () => apiData.newArrivals.map((p) => toRailProduct(p, cart, loggedIn)),
    [apiData.newArrivals, cart, loggedIn]
  );
  const featured = useMemo(
    () => apiData.featured.map((p) => toRailProduct(p, cart, loggedIn)),
    [apiData.featured, cart, loggedIn]
  );
  const concerns = useMemo(
    () =>
      apiData.concernShelves.map((c) => ({
        ...c,
        products: c.rawProducts.map((p) => toRailProduct(p, cart, loggedIn)),
      })),
    [apiData.concernShelves, cart, loggedIn]
  );

  const openProduct = (p: { id: number; handle?: string }) => router.push(productHref(p));
  const addProduct = (id: number) => {
    const p = productById(id);
    addToCart(id, 1);
    if (p) flash(addFlashLabel(p.name));
  };
  // API-sourced rails (Best sellers/New arrivals/Featured/Concern shelves): shared with Search
  // - see useApiCartActions for why this differs from addProduct above.
  const { addApiProduct, incApiProduct, decApiProduct } = useApiCartActions();
  const goLogin = () => router.push('/account');
  const goCategories = () => router.push('/categories');
  // Categories is a persistent tab screen, not a fresh page each time - passing categoryId as a
  // param (read by categories.tsx) is what lets it land pre-selected on that category instead of
  // always opening to "All products" regardless of which tile was tapped.
  const openCategory = (categoryId: string) => router.push({ pathname: '/categories', params: { categoryId } });

  const openListing = (ids: number[], title: string, tagline: string, tint: string) => {
    router.push({ pathname: '/listing', params: { ids: ids.join(','), title, tagline, tint } });
  };
  const openListingByCategory = (catName: string, title: string, tagline: string, tint: string) =>
    openListing(productIdsByCategory(catName), title, tagline, tint);
  // Brand cards get their own real path through Listing (collectionId param) instead of the
  // ids-based one above - a brand can have 40-160+ products, way past what's reasonable to pass
  // as a comma-joined id list in a URL, and unlike the mock ids/getListingProducts path this one
  // is real-data (see listing.tsx's collectionId branch).
  const openBrandListing = (b: ApiBrand) => {
    router.push({ pathname: '/listing', params: { collectionId: b.id, title: b.name, tagline: `${b.skus} products`, tint: b.tint } });
  };

  const handlePromoBanner = (b: (typeof promoBanners)[number]) => {
    if ('targetListing' in b && b.targetListing) {
      const t = b.targetListing;
      return openListingByCategory(t.cat, t.title, t.tagline, t.tint);
    }
    if ('targetScreen' in b && b.targetScreen === 'categories') return router.push('/categories');
    if ('targetScreen' in b && b.targetScreen === 'stores') return router.push('/stores');
  };

  return (
    <View style={styles.screen}>
      <Header />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero carousel - backed by GET /store/banners?target_type=home. The Banner model is
            image-only (no eyebrow/title/blurb/cta text, unlike the old mock slides), and the
            section renders nothing at all when there are no banners yet, rather than showing an
            empty rail. */}
        {apiData.heroBanners.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.heroRail}>
            {apiData.heroBanners.map((b) => (
              <Pressable key={b.id} onPress={goCategories} style={styles.heroImageCard}>
                <Image source={{ uri: b.image_url as string }} style={styles.heroImage} contentFit="cover" />
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Up to 63% profit margin — decorative tier copy, not wired to real tier logic */}
        <Pressable onPress={goCategories} style={styles.marginBanner}>
          <View style={styles.marginBannerIcon}>
            <MarginTrendIcon size={19} />
          </View>
          <View style={styles.marginBannerText}>
            <Text style={styles.marginBannerTitle}>Up to 63% profit margin</Text>
            <Text style={styles.marginBannerSub}>Tier 2 · ₹2.3k more to unlock Tier 3</Text>
          </View>
          <ChevronRightIcon size={16} color={ds.primaryInk} strokeWidth={2} />
        </Pressable>

        {/* Prescription at a glance */}
        <DsSectionHeader
          title="Prescription at a glance"
          subtitle="Curated product groups for common prescriptions"
          actionLabel="View all"
          onAction={goCategories}
        />
        {/* Backed by GET /store/category-sections, flattened/deduped across sections. Real
            categories have no glyph/tint of their own (only id/name/handle), so those stay a
            rotating placeholder - same approach as margin/rating on the product cards. Tapping a
            tile opens Categories pre-selected to that real category (openCategory), not just a
            generic landing on "All products". */}
        <View style={styles.prescriptionGrid}>
          {apiData.categoryTiles.map((g: ApiCategoryTile) => (
            <Pressable key={g.id} onPress={() => openCategory(g.id)} style={styles.prescriptionTile}>
              <View style={[styles.prescriptionGlyphTile, { backgroundColor: g.tint }]}>
                <Text style={styles.prescriptionGlyph}>{g.glyph}</Text>
              </View>
              <Text style={styles.prescriptionName}>{g.name}</Text>
            </Pressable>
          ))}
        </View>

        {/* Fast-moving offers */}
        <DsSectionHeader title="Fast-moving offers" subtitle="Price, pack and use case in one glance" />
        <View style={styles.fastMovingList}>
          {fastMoving.map((m) => {
            const qty = cart[m.pid] || 0;
            const inCart = qty > 0;
            return (
              <View key={m.pid} style={styles.fastMovingRow}>
                <Pressable onPress={() => openProduct({ id: m.pid })} style={styles.fastMovingPhoto}>
                  <Text style={styles.fastMovingPhotoLabel}>photo</Text>
                </Pressable>
                <View style={styles.fastMovingInfo}>
                  <Pressable onPress={() => openProduct({ id: m.pid })}>
                    <Text style={styles.fastMovingName} numberOfLines={1}>{m.name}</Text>
                  </Pressable>
                  <Text style={styles.fastMovingUseCase} numberOfLines={1}>{m.useCase}</Text>
                  <Text style={styles.fastMovingPrice}>{m.price}</Text>
                </View>
                {inCart ? (
                  <View style={styles.fastMovingStepper}>
                    <Pressable onPress={() => dec(m.pid)} style={styles.fastMovingStepperBtn} hitSlop={4}>
                      {qty <= 1 ? <TrashIcon size={14} color={ds.dangerInk} /> : <Text style={styles.stepperGlyph}>−</Text>}
                    </Pressable>
                    <Text style={styles.fastMovingQty}>{qty}</Text>
                    <Pressable onPress={() => inc(m.pid)} style={styles.fastMovingStepperBtn} hitSlop={4}>
                      <Text style={styles.stepperGlyph}>+</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => {
                      addToCart(m.pid, 1);
                      flash(m.name + ' added');
                    }}
                    style={styles.fastMovingAdd}
                  >
                    <CartIcon size={14} color={ds.surface} />
                    <Text style={styles.fastMovingAddText}>Add</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>

        {/* Explore full catalogue CTA */}
        <Pressable onPress={goCategories} style={styles.catalogueBand}>
          <View style={styles.catalogueText}>
            <Text style={styles.catalogueTitle}>Explore full catalogue</Text>
            <Text style={styles.catalogueSub}>300+ products across 8 categories</Text>
          </View>
          <ChevronRightIcon size={18} color={ds.surface} strokeWidth={2} />
        </Pressable>

        {/* USP tiles */}
        <View style={styles.uspGrid}>
          <View style={styles.uspTile}>
            <View style={[styles.uspIconTile, { backgroundColor: ds.primarySoft }]}>
              <MarginTrendIcon size={17} />
            </View>
            <Text style={styles.uspLabel}>Better margin</Text>
          </View>
          <View style={styles.uspTile}>
            <View style={[styles.uspIconTile, { backgroundColor: ds.accentSoft }]}>
              <DeliveryBoxIcon size={17} />
            </View>
            <Text style={styles.uspLabel}>Quick delivery</Text>
          </View>
          <View style={styles.uspTile}>
            <View style={[styles.uspIconTile, { backgroundColor: ds.info }]}>
              <ShieldCheckIcon size={17} />
            </View>
            <Text style={styles.uspLabel}>Authentic ingredients</Text>
          </View>
        </View>

        {/* Buy again */}
        <DsSectionHeader title="Buy again" subtitle="Ordered at least twice in the last 90 days" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
          {buyAgain.map((p) => (
            <DsProductCard
              key={p.id}
              product={p}
              width={166}
              onOpen={() => openProduct(p)}
              onAdd={() => addProduct(p.id)}
              onInc={() => inc(p.id)}
              onDec={() => dec(p.id)}
              onLogin={goLogin}
            />
          ))}
        </ScrollView>

        {/* Brands to know - backed by the real "AYURVEDA ONE PVT LTD." / "AYUR VIBES" collections;
            skus is each collection's real product count (GET /store/products-search?collection_id
            with limit=1, reading `count`). initials/line/tint have no backend source, same
            placeholder approach as everywhere else real data doesn't cover a design field yet. */}
        <DsSectionHeader title="Brands to know" subtitle="Direct trade partners, no middle margin" />
        <View style={styles.brandsRow}>
          {apiData.brands.map((b: ApiBrand) => (
            <Pressable key={b.id} onPress={() => openBrandListing(b)} style={styles.brandCard}>
              <View style={styles.brandImage}>
                <Text style={styles.brandImageLabel}>store photo</Text>
                <View style={styles.brandInitials}>
                  <Text style={styles.brandInitialsText}>{b.initials}</Text>
                </View>
              </View>
              <View style={styles.brandBody}>
                <Text style={styles.brandName}>{b.name}</Text>
                <Text style={styles.brandLine}>{b.line}</Text>
                <Text style={styles.brandSkus}>{b.skus} products →</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Best sellers - backed by product-sections slug "best-sellers" */}
        {bestSellers.length > 0 && (
          <>
            <DsSectionHeader
              title="Best sellers"
              subtitle="Top-moving cases across every outlet"
              actionLabel="View all"
              onAction={() => openListing(bestSellers.map((p) => p.id), 'Best sellers', 'Top-moving cases across every outlet', ds.primarySoft)}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
              {bestSellers.map((p) => (
                <DsProductCard
                  key={p.id}
                  product={p}
                  width={166}
                  onOpen={() => openProduct(p)}
                  onAdd={() => addApiProduct(p)}
                  onInc={() => incApiProduct(p)}
                  onDec={() => decApiProduct(p)}
                  onLogin={goLogin}
                />
              ))}
            </ScrollView>
          </>
        )}

        {/* New arrivals - backed by product-sections slug "new-arrivals"; no such section exists
            in the backend yet, so this renders nothing until an admin creates one. */}
        {newArrivals.length > 0 && (
          <>
            <DsSectionHeader
              title="New arrivals"
              subtitle="Added to the trade catalogue this week"
              actionLabel="View all"
              onAction={() => openListing(newArrivals.map((p) => p.id), 'New arrivals', 'Added to the trade catalogue this week', ds.primarySoft)}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
              {newArrivals.map((p) => (
                <DsProductCard
                  key={p.id}
                  product={p}
                  width={166}
                  onOpen={() => openProduct(p)}
                  onAdd={() => addApiProduct(p)}
                  onInc={() => incApiProduct(p)}
                  onDec={() => decApiProduct(p)}
                  onLogin={goLogin}
                />
              ))}
            </ScrollView>
          </>
        )}

        {/* Promo banner carousel */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promoRail}>
          {promoBanners.map((pb) => (
            <Pressable key={pb.title} onPress={() => handlePromoBanner(pb)} style={[styles.promoCard, { backgroundColor: pb.tint }]}>
              <Text style={styles.promoEyebrow}>{pb.eyebrow}</Text>
              <Text style={styles.promoTitle}>{pb.title}</Text>
              <Text style={styles.promoSub}>{pb.sub}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Featured products - backed by product-sections slug "featured-product" */}
        {featured.length > 0 && (
          <>
            <DsSectionHeader
              title="Featured products"
              subtitle="Hand-picked by your account manager."
              actionLabel="View all"
              onAction={() => openListing(featured.map((p) => p.id), 'Featured products', 'Hand-picked by your account manager', ds.primarySoft)}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
              {featured.map((p) => (
                <DsProductCard
                  key={p.id}
                  product={p}
                  width={166}
                  onOpen={() => openProduct(p)}
                  onAdd={() => addApiProduct(p)}
                  onInc={() => incApiProduct(p)}
                  onDec={() => decApiProduct(p)}
                  onLogin={goLogin}
                />
              ))}
            </ScrollView>
          </>
        )}

        {/* Concern shelves - backed by every remaining product-section (anything that isn't
            best-sellers/new-arrivals/featured-product/buy-again/fast-moving-offer) */}
        {concerns.map((c) => (
          <View key={c.slug}>
            <Pressable
              onPress={() => openListing(c.ids, c.title, c.blurb, c.tint)}
              style={[styles.concernBanner, { backgroundColor: c.tint }]}
            >
              <View style={styles.concernIcon}>
                <ConcernLeafIcon size={19} />
              </View>
              <View style={styles.concernText}>
                <Text style={styles.concernTitle}>{c.title}</Text>
                <Text style={styles.concernBlurb}>{c.blurb}</Text>
              </View>
              <ChevronRightIcon size={18} color={ds.primaryInk} strokeWidth={2} />
            </Pressable>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
              {c.products.map((p) => (
                <DsProductCard
                  key={p.id}
                  product={p}
                  width={166}
                  onOpen={() => openProduct(p)}
                  onAdd={() => addApiProduct(p)}
                  onInc={() => incApiProduct(p)}
                  onDec={() => decApiProduct(p)}
                  onLogin={goLogin}
                />
              ))}
            </ScrollView>
          </View>
        ))}

        {/* Doctor's Talk */}
        <View style={styles.plainSectionHeader}>
          <Text style={styles.plainSectionTitle}>Doctor&apos;s Talk</Text>
          <Text style={styles.plainSectionSubtitle}>Trusted by practitioners who recommend us to their patients</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
          {doctorTalks.map((d) => (
            <View key={d.name} style={styles.doctorCard}>
              <Text style={styles.quoteGlyph}>“</Text>
              <Text style={styles.doctorQuote}>{d.quote}</Text>
              <View style={styles.testimonialFooter}>
                <View style={styles.doctorAvatar}>
                  <Text style={styles.doctorAvatarText}>{d.initials}</Text>
                </View>
                <View style={styles.testimonialNameBlock}>
                  <Text style={styles.testimonialName}>{d.name}</Text>
                  <Text style={styles.testimonialTag}>{d.title}</Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* What buyers say */}
        <View style={styles.plainSectionHeader}>
          <Text style={styles.plainSectionTitle}>What buyers say</Text>
          <Text style={styles.plainSectionSubtitle}>Real feedback from people who order every week</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
          {buyerReviews.map((r) => (
            <View key={r.name} style={styles.reviewCard}>
              <View style={styles.reviewStars}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Text key={n} style={styles.reviewStar}>★</Text>
                ))}
              </View>
              <Text style={styles.reviewQuote}>{r.quote}</Text>
              <View style={styles.testimonialFooter}>
                <View style={styles.reviewAvatar}>
                  <Text style={styles.reviewAvatarText}>{r.initials}</Text>
                </View>
                <View style={styles.testimonialNameBlock}>
                  <Text style={styles.testimonialName}>{r.name}</Text>
                  <Text style={styles.testimonialTag}>{r.tag}</Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ds.canvas },
  scrollContent: { paddingBottom: dsSpacing.xl },

  heroRail: { flexDirection: 'row', gap: dsSpacing.md, paddingHorizontal: dsSpacing.lg, paddingTop: dsSpacing.md },
  heroImageCard: { width: 302, aspectRatio: 16 / 9, borderRadius: dsRadii.sheet, overflow: 'hidden', backgroundColor: ds.primarySoft },
  heroImage: { width: '100%', height: '100%' },

  marginBanner: {
    marginHorizontal: dsSpacing.lg,
    marginTop: dsSpacing.md,
    backgroundColor: ds.primarySoft,
    borderRadius: dsRadii.button,
    padding: dsSpacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: dsSpacing.md,
  },
  marginBannerIcon: { width: 38, height: 38, borderRadius: dsRadii.button, backgroundColor: ds.surface, alignItems: 'center', justifyContent: 'center' },
  marginBannerText: { flex: 1, minWidth: 0 },
  marginBannerTitle: { fontFamily: dsFontFamily[600], fontSize: 16, lineHeight: 22, letterSpacing: -0.16, color: ds.primaryInk },
  marginBannerSub: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink2, marginTop: 4 },

  prescriptionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: dsSpacing.md,
    columnGap: dsSpacing.sm,
    paddingHorizontal: dsSpacing.lg,
    paddingTop: dsSpacing.md,
  },
  prescriptionTile: { width: '31%', flexGrow: 1 },
  prescriptionGlyphTile: { width: '100%', aspectRatio: 1, borderRadius: dsRadii.button, alignItems: 'center', justifyContent: 'center' },
  prescriptionGlyph: { fontFamily: dsFontFamily[700], fontSize: 22, lineHeight: 28, color: ds.primaryInk },
  prescriptionName: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink2, textAlign: 'center', marginTop: dsSpacing.sm },

  fastMovingList: { paddingHorizontal: dsSpacing.lg, paddingTop: dsSpacing.md, gap: dsSpacing.md },
  fastMovingRow: {
    backgroundColor: ds.surface,
    borderWidth: 1,
    borderColor: ds.line,
    borderRadius: dsRadii.button,
    padding: dsSpacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: dsSpacing.md,
    ...dsElevation.e1,
  },
  fastMovingPhoto: { width: 72, height: 72, borderRadius: dsRadii.input, backgroundColor: ds.primarySoft, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4 },
  fastMovingPhotoLabel: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink3 },
  fastMovingInfo: { flex: 1, minWidth: 0 },
  fastMovingName: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink },
  fastMovingUseCase: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink2, marginTop: 4 },
  fastMovingPrice: { fontFamily: dsFontFamily[700], fontSize: 14, lineHeight: 20, color: ds.primaryInk, marginTop: dsSpacing.sm },
  fastMovingAdd: {
    height: 40,
    borderRadius: dsRadii.button,
    backgroundColor: ds.primaryStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: dsSpacing.sm,
    paddingHorizontal: dsSpacing.md,
  },
  fastMovingAddText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.surface },
  fastMovingStepper: { flexDirection: 'row', alignItems: 'center', height: 40, borderRadius: dsRadii.button, backgroundColor: ds.primarySoft },
  fastMovingStepperBtn: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  fastMovingQty: { minWidth: 24, textAlign: 'center', fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.primaryInk },
  stepperGlyph: { fontFamily: dsFontFamily[700], fontSize: 18, lineHeight: 24, color: ds.primaryInk },

  catalogueBand: {
    marginHorizontal: dsSpacing.lg,
    marginTop: dsSpacing.xl,
    borderRadius: dsRadii.sheet,
    backgroundColor: ds.primaryInk,
    paddingHorizontal: dsSpacing.lg,
    paddingVertical: dsSpacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: dsSpacing.md,
  },
  catalogueText: { flex: 1, minWidth: 0 },
  catalogueTitle: { fontFamily: dsFontFamily[700], fontSize: 18, lineHeight: 24, letterSpacing: -0.18, color: ds.surface },
  catalogueSub: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: 'rgba(255,255,255,.72)', marginTop: 4 },

  uspGrid: { flexDirection: 'row', gap: dsSpacing.sm, paddingHorizontal: dsSpacing.lg, paddingTop: dsSpacing.md },
  uspTile: { flex: 1, backgroundColor: ds.surface, borderWidth: 1, borderColor: ds.line, borderRadius: dsRadii.button, padding: dsSpacing.md, alignItems: 'center', ...dsElevation.e1 },
  uspIconTile: { width: 34, height: 34, borderRadius: dsRadii.button, alignItems: 'center', justifyContent: 'center' },
  uspLabel: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink, marginTop: dsSpacing.sm },

  rail: { flexDirection: 'row', gap: dsSpacing.md, paddingHorizontal: dsSpacing.lg, paddingTop: dsSpacing.md },

  brandsRow: { flexDirection: 'row', gap: dsSpacing.md, paddingHorizontal: dsSpacing.lg, paddingTop: dsSpacing.md },
  brandCard: { flex: 1, minWidth: 0, backgroundColor: ds.surface, borderWidth: 1, borderColor: ds.line, borderRadius: dsRadii.button, overflow: 'hidden', ...dsElevation.e1 },
  brandImage: { aspectRatio: 4 / 3, backgroundColor: ds.primarySoft, justifyContent: 'flex-end', padding: 8 },
  brandImageLabel: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink3 },
  brandInitials: { position: 'absolute', top: 8, left: 8, width: 32, height: 32, borderRadius: dsRadii.input, backgroundColor: ds.surface, alignItems: 'center', justifyContent: 'center' },
  brandInitialsText: { fontFamily: dsFontFamily[600], fontSize: 11, lineHeight: 14, letterSpacing: 0.22, color: ds.primaryInk },
  brandBody: { padding: dsSpacing.md, gap: 4 },
  brandName: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink },
  brandLine: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink2 },
  brandSkus: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.primaryInk, marginTop: 4 },

  promoRail: { flexDirection: 'row', gap: dsSpacing.sm, paddingHorizontal: dsSpacing.sm, paddingTop: dsSpacing.lg },
  promoCard: { width: 272, borderRadius: dsRadii.sheet, padding: dsSpacing.md },
  promoEyebrow: { fontFamily: dsFontFamily[700], fontSize: 11, lineHeight: 14, letterSpacing: 1.32, color: ds.ink2 },
  promoTitle: { fontFamily: dsFontFamily[700], fontSize: 18, lineHeight: 24, letterSpacing: -0.18, color: ds.ink, marginTop: dsSpacing.sm },
  promoSub: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink2, marginTop: 4 },

  concernBanner: {
    marginHorizontal: dsSpacing.lg,
    marginTop: dsSpacing.xl,
    marginBottom: dsSpacing.md,
    borderRadius: dsRadii.button,
    padding: dsSpacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: dsSpacing.md,
  },
  concernIcon: { width: 38, height: 38, borderRadius: dsRadii.button, backgroundColor: ds.surface, alignItems: 'center', justifyContent: 'center' },
  concernText: { flex: 1, minWidth: 0 },
  concernTitle: { fontFamily: dsFontFamily[600], fontSize: 16, lineHeight: 22, letterSpacing: -0.16, color: ds.ink },
  concernBlurb: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink2, marginTop: 4 },

  plainSectionHeader: { paddingHorizontal: dsSpacing.lg, paddingTop: dsSpacing.xl },
  plainSectionTitle: { fontFamily: dsFontFamily[600], fontSize: 16, lineHeight: 22, letterSpacing: -0.16, color: ds.ink },
  plainSectionSubtitle: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink2, marginTop: 4 },

  doctorCard: { width: 272, backgroundColor: ds.surface, borderWidth: 1, borderColor: ds.line, borderRadius: dsRadii.sheet, padding: dsSpacing.md },
  quoteGlyph: { fontFamily: dsFontFamily[700], fontSize: 32, lineHeight: 32, color: ds.primarySoft },
  doctorQuote: { fontFamily: dsFontFamily[400], fontSize: 14, lineHeight: 21, color: ds.ink, marginTop: dsSpacing.md },
  testimonialFooter: { flexDirection: 'row', alignItems: 'center', gap: dsSpacing.sm, marginTop: dsSpacing.md },
  doctorAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: ds.primarySoft, alignItems: 'center', justifyContent: 'center' },
  doctorAvatarText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.primaryInk },
  testimonialNameBlock: { flex: 1, minWidth: 0 },
  testimonialName: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink },
  testimonialTag: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink2, marginTop: 4 },

  reviewCard: { width: 252, backgroundColor: ds.surface, borderWidth: 1, borderColor: ds.line, borderRadius: dsRadii.sheet, padding: dsSpacing.lg },
  reviewStars: { flexDirection: 'row' },
  reviewStar: { fontFamily: dsFontFamily[400], fontSize: 14, lineHeight: 21, color: ds.star },
  reviewQuote: { fontFamily: dsFontFamily[400], fontSize: 14, lineHeight: 21, color: ds.ink, marginTop: dsSpacing.md },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: ds.canvas, alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink },
});
