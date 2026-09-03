import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ds, dsFontFamily, dsRadii, dsSpacing, dsElevation } from '@/theme';
import { Header } from '@/components/shell/Header';
import { DsSectionHeader } from '@/components/ds/DsSectionHeader';
import { DsProductCard } from '@/components/ds/DsProductCard';
import { VariantSheet } from '@/components/shell/VariantSheet';
import { Skeleton } from '@/components/primitives/Skeleton';
import { MarginTrendIcon, DeliveryBoxIcon, ShieldCheckIcon, ChevronRightIcon, ConcernLeafIcon, CartIcon, TrashIcon } from '@/icons';
import { useAppState } from '@/state/AppStateContext';
import { useHomeApiData, useDoctorTalks, toRailProduct, type ApiCategoryTile, type ApiBrand } from '@/data/homeApi';
import { useApiCartActions } from '@/data/useApiCartActions';
import { useBuyAgainProducts } from '@/data/ordersApi';
import { useReviewSummaries, useRecentReviews } from '@/data/reviewsApi';
import { productHref } from '@/data/idHash';
import type { Product } from '@/data/types';

// Thousands-separator formatting for the real catalog product/category counts - plain regex
// rather than toLocaleString, since Intl number formatting isn't guaranteed available on every
// Hermes/RN runtime this app might run on.
function formatCount(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Rebuilt against the new AyurvedaOne design system (Various Mobile App - Phone.dc.html, isHome
// block, line 40-452). Every section below is in the source's exact order; sections whose content
// is purely decorative/static in the source (the "Up to 63% profit margin" tier copy, the USP tile
// labels) are hardcoded here exactly as the source hardcodes them, not wired to any real tier logic
// — same fidelity approach as every previous screen in this app.
export default function HomeScreen() {
  const router = useRouter();
  const { cart, loggedIn, bulkQtyThreshold } = useAppState();

  // Real order history (GET /store/orders, see ordersApi.ts) - up to the 10 most recently
  // ordered distinct products, current price/thumbnail/handle re-hydrated same as every other
  // real rail. Empty (and the whole section hidden) whenever there's no real order to derive it
  // from - logged out, or logged in with no past orders yet.
  const buyAgainApi = useBuyAgainProducts(loggedIn);

  // Real approved reviews (GET /store/reviews, no product_id - site-wide feed), most recent
  // first, capped at 5 - replaces the old fully-invented buyerReviews mock.
  const recentReviews = useRecentReviews(5);
  const reviewsWithComment = useMemo(
    () => recentReviews.reviews.filter((r) => !!r.comment),
    [recentReviews.reviews]
  );

  // Real testimonials (Operations > Doctor's Talk in admin) - replaces the old hardcoded
  // doctorTalks array.
  const doctorTalksApi = useDoctorTalks();

  // Best sellers / New arrivals / Featured / Fast-moving offers / Concern shelves / category
  // tiles / brands / hero banners are all backed by the real backend now (product-sections,
  // category-sections, collections, banners) - see useHomeApiData.
  const apiData = useHomeApiData();

  // Real rating/review-count aggregate (apps/backend's review module, reviewsApi.ts) for every
  // product shown on this screen, fetched once as a single batch rather than per rail/per card.
  const allProductIds = useMemo(
    () => [
      ...buyAgainApi.products.map((p) => p.id),
      ...apiData.bestSellers.map((p) => p.id),
      ...apiData.newArrivals.map((p) => p.id),
      ...apiData.featured.map((p) => p.id),
      ...apiData.fastMoving.map((p) => p.id),
      ...apiData.concernShelves.flatMap((c) => c.rawProducts.map((p) => p.id)),
    ],
    [buyAgainApi.products, apiData.bestSellers, apiData.newArrivals, apiData.featured, apiData.fastMoving, apiData.concernShelves]
  );
  const reviewSummaries = useReviewSummaries(allProductIds);

  const buyAgain = useMemo(
    () => buyAgainApi.products.map((p) => toRailProduct(p, cart, loggedIn, reviewSummaries)),
    [buyAgainApi.products, cart, loggedIn, reviewSummaries]
  );
  const bestSellers = useMemo(
    () => apiData.bestSellers.map((p) => toRailProduct(p, cart, loggedIn, reviewSummaries)),
    [apiData.bestSellers, cart, loggedIn, reviewSummaries]
  );
  const newArrivals = useMemo(
    () => apiData.newArrivals.map((p) => toRailProduct(p, cart, loggedIn, reviewSummaries)),
    [apiData.newArrivals, cart, loggedIn, reviewSummaries]
  );
  const featured = useMemo(
    () => apiData.featured.map((p) => toRailProduct(p, cart, loggedIn, reviewSummaries)),
    [apiData.featured, cart, loggedIn, reviewSummaries]
  );
  const fastMoving = useMemo(
    () => apiData.fastMoving.map((p) => toRailProduct(p, cart, loggedIn, reviewSummaries)),
    [apiData.fastMoving, cart, loggedIn, reviewSummaries]
  );
  const concerns = useMemo(
    () =>
      apiData.concernShelves.map((c) => ({
        ...c,
        products: c.rawProducts.map((p) => toRailProduct(p, cart, loggedIn, reviewSummaries)),
      })),
    [apiData.concernShelves, cart, loggedIn, reviewSummaries]
  );

  const openProduct = (p: { id: number; handle?: string }) => router.push(productHref(p));
  // Every real rail on this screen (Best sellers/New arrivals/Featured/Fast-moving/Concern
  // shelves/Buy again) shares these - see useApiCartActions for the real-cart-sync behavior.
  const { addApiProduct, incApiProduct, decApiProduct } = useApiCartActions();
  const [variantSheetProduct, setVariantSheetProduct] = useState<Product | null>(null);
  const goLogin = () => router.push('/account');
  const goCategories = () => router.push('/categories');
  // Categories is a persistent tab screen, not a fresh page each time - passing categoryId as a
  // param (read by categories.tsx) is what lets it land pre-selected on that category instead of
  // always opening to "All products" regardless of which tile was tapped.
  const openCategory = (categoryId: string) => router.push({ pathname: '/categories', params: { categoryId } });

  // Brand cards get their own real path through Listing (collectionId param) - a brand can have
  // 40-160+ products, way past what's reasonable to pass as a comma-joined id list in a URL, and
  // this is real-data (see listing.tsx's collectionId branch). Every other rail's "View all"
  // (Best sellers/New arrivals/Featured/Concern shelves) used to route through an ids-based
  // Listing path too, but those ids are this app's internal hashed real-product ids, which
  // Listing's `ids` param only ever resolved against the old MOCK catalog - so it opened an
  // empty/garbage listing. Simplified to just open Categories' "All" view instead, same as
  // "Explore full catalogue" already does.
  const openBrandListing = (b: ApiBrand) => {
    // Listing's hero banner: prefer the dedicated listingBannerImageUrl (admin's separate
    // "Listing Banner Image" upload, sized for a wide banner); fall back to the same square
    // imageUrl already shown on this brand's Home card if no banner-specific image is set;
    // listing.tsx itself falls back further to a flat tint when both are empty.
    const heroImage = b.listingBannerImageUrl ?? b.imageUrl ?? '';
    router.push({ pathname: '/listing', params: { collectionId: b.id, title: b.name, tagline: `${b.skus} products`, tint: b.tint, image: heroImage } });
  };

  return (
    <View style={styles.screen}>
      <Header />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero carousel - backed by GET /store/banners?target_type=home. The Banner model is
            image-only (no eyebrow/title/blurb/cta text, unlike the old mock slides), and the
            section renders nothing at all when there are no banners yet, rather than showing an
            empty rail. A skeleton shows only while this section's own fetch is still in flight -
            not gated on any other section's data (see homeApi.ts's HomeApiData comment). */}
        {apiData.heroBannersLoading ? (
          <View style={styles.heroRail}>
            <View style={[styles.heroImageCard, { backgroundColor: ds.line }]} />
          </View>
        ) : (
          apiData.heroBanners.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.heroRail}>
              {apiData.heroBanners.map((b) => (
                <Pressable key={b.id} onPress={goCategories} style={styles.heroImageCard}>
                  <Image source={{ uri: b.image_url as string }} style={styles.heroImage} contentFit="cover" />
                </Pressable>
              ))}
            </ScrollView>
          )
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
          title="Explore by product form"
          subtitle="Browse ayurvedic products by formulation type."
          actionLabel="View all"
          onAction={goCategories}
        />
        {/* Backed by GET /store/category-sections, flattened/deduped across sections. Real
            categories have no glyph/tint of their own (only id/name/handle), so those stay a
            rotating placeholder - same approach as margin/rating on the product cards. Tapping a
            tile opens Categories pre-selected to that real category (openCategory), not just a
            generic landing on "All products". */}
        {apiData.categoryTilesLoading ? (
          <CategoryTilesSkeleton />
        ) : (
        <View style={styles.prescriptionGrid}>
          {apiData.categoryTiles.map((g: ApiCategoryTile) => (
            <Pressable key={g.id} onPress={() => openCategory(g.id)} style={styles.prescriptionTile}>
              {g.imageUrl ? (
                <View style={styles.prescriptionGlyphTile}>
                  <Image source={{ uri: g.imageUrl }} style={styles.prescriptionImage} contentFit="cover" />
                </View>
              ) : (
                <View style={[styles.prescriptionGlyphTile, { backgroundColor: g.tint }]}>
                  <Text style={styles.prescriptionGlyph}>{g.glyph}</Text>
                </View>
              )}
              <Text style={styles.prescriptionName}>{g.name}</Text>
            </Pressable>
          ))}
        </View>
        )}

        {/* Fast-moving offers - original row-list UI, now backed by product-sections slug
            "fast-moving-offer" instead of mock data. The source design's row shows a per-product
            "use case" label (Grahani/Vyanga/Khalitya) that was hand-picked mock copy with no real
            backend equivalent - real products show their actual category there instead (hidden
            entirely when a product has no category), everything else (photo, name, price, add/
            stepper) is the real product. */}
        {apiData.fastMovingLoading ? (
          <>
            <DsSectionHeader title="Products in demand" subtitle="Popular picks for your next order" />
            <FastMovingSkeleton />
          </>
        ) : fastMoving.length > 0 && (
          <>
            <DsSectionHeader title="Products in demand" subtitle="Popular picks for your next order" />
            <View style={styles.fastMovingList}>
              {fastMoving.map((p) => {
                const qty = p.cartQty;
                const inCart = qty > 0;
                // Same hasDiscount gate as DsProductCard - a struck MRP/discount chip is only
                // genuine when the product actually has one (p.cmp set); decorateProduct's
                // compareLabel falls back to a fabricated price*1.18 otherwise, so gate on cmp
                // directly rather than trusting compareLabel to always be meaningful.
                const hasDiscount = !!p.cmp;
                return (
                  <View key={p.id} style={styles.fastMovingRow}>
                    <Pressable onPress={() => openProduct(p)} style={styles.fastMovingPhoto}>
                      {p.thumbnail ? (
                        <Image source={{ uri: p.thumbnail }} style={styles.fastMovingImage} contentFit="cover" />
                      ) : (
                        <Text style={styles.fastMovingPhotoLabel}>photo</Text>
                      )}
                      {hasDiscount && <Text style={styles.fastMovingDiscountChip}>{p.discount}</Text>}
                    </Pressable>
                    <View style={styles.fastMovingInfo}>
                      <Pressable onPress={() => openProduct(p)}>
                        <Text style={styles.fastMovingName} numberOfLines={1}>{p.name}</Text>
                      </Pressable>
                      {!!p.cat && <Text style={styles.fastMovingUseCase} numberOfLines={1}>{p.cat}</Text>}
                      <View style={styles.fastMovingPriceRow}>
                        <Text style={styles.fastMovingPrice}>{p.priceLabel}</Text>
                        {hasDiscount && <Text style={styles.fastMovingCompare}>{p.compareLabel}</Text>}
                      </View>
                    </View>
                    {inCart ? (
                      <FastMovingStepper
                        qty={qty}
                        onInc={() => incApiProduct(p)}
                        onDec={() => decApiProduct(p)}
                        showBulkNudge={!!bulkQtyThreshold && qty >= bulkQtyThreshold}
                        onOpenProduct={() => openProduct(p)}
                      />
                    ) : (
                      <Pressable onPress={() => addApiProduct(p)} style={styles.fastMovingAdd}>
                        <CartIcon size={14} color={ds.surface} />
                        <Text style={styles.fastMovingAddText}>Add</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Explore full catalogue CTA - real counts (GET /store/products-search and
            /store/product-categories, both limit:1 just to read `count`), replacing the old
            hardcoded "300+ products across 8 categories". */}
        <Pressable onPress={goCategories} style={styles.catalogueBand}>
          <View style={styles.catalogueText}>
            <Text style={styles.catalogueTitle}>Explore full catalogue</Text>
            {apiData.catalogCountsLoading ? (
              <View style={styles.catalogueSkeletonBar} />
            ) : (
              <Text style={styles.catalogueSub}>
                {formatCount(apiData.catalogProductCount)} products across {apiData.catalogCategoryCount} categories
              </Text>
            )}
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

        {/* Buy again - real GET /store/orders data (ordersApi.ts), hidden entirely when logged
            out or when the logged-in customer has no past orders yet - no mock/placeholder
            fallback. A skeleton only makes sense while logged in AND actually loading - a
            logged-out visitor never sees this section at all, skeleton included. */}
        {loggedIn && buyAgainApi.loading ? (
          <>
            <DsSectionHeader title="Buy again" subtitle="From your recent orders" />
            <RailSkeleton />
          </>
        ) : (
          buyAgain.length > 0 && (
            <>
              <DsSectionHeader title="Buy again" subtitle="From your recent orders" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
                {buyAgain.map((p) => (
                  <DsProductCard
                    key={p.id}
                    product={p}
                    width={166}
                    onOpen={() => openProduct(p)}
                    onAdd={() => addApiProduct(p)}
                    onInc={() => incApiProduct(p)}
                    onDec={() => decApiProduct(p)}
                    onLogin={goLogin}
                    onSelectOption={() => setVariantSheetProduct(p)}
                    bulkQtyThreshold={bulkQtyThreshold}
                  />
                ))}
              </ScrollView>
            </>
          )
        )}

        {/* Brands to know - backed by the real "AYURVEDA ONE PVT LTD." / "AYUR VIBES" collections;
            skus is each collection's real product count (GET /store/products-search?collection_id
            with limit=1, reading `count`). initials/line/tint have no backend source, same
            placeholder approach as everywhere else real data doesn't cover a design field yet. */}
        <DsSectionHeader title="Brands for your practice" subtitle="Choose trusted ayurvedic brands." />
        {apiData.brandsLoading ? (
          <BrandsRowSkeleton />
        ) : (
        <View style={styles.brandsRow}>
          {apiData.brands.map((b: ApiBrand) => (
            <Pressable key={b.id} onPress={() => openBrandListing(b)} style={styles.brandCard}>
              <View style={styles.brandImage}>
                {b.imageUrl ? (
                  <Image source={{ uri: b.imageUrl }} style={styles.brandRealImage} contentFit="cover" />
                ) : (
                  <Text style={styles.brandImageLabel}>store photo</Text>
                )}
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
        )}

        {/* Best sellers - backed by product-sections slug "best-sellers" */}
        {apiData.bestSellersLoading ? (
          <>
            <DsSectionHeader
              title="Best sellers"
              actionLabel="View all"
              onAction={goCategories}
            />
            <RailSkeleton />
          </>
        ) : bestSellers.length > 0 && (
          <>
            <DsSectionHeader
              title="Best sellers"
              actionLabel="View all"
              onAction={goCategories}
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
                  onSelectOption={() => setVariantSheetProduct(p)}
                  bulkQtyThreshold={bulkQtyThreshold}
                />
              ))}
            </ScrollView>
          </>
        )}

        {/* New arrivals - backed by product-sections slug "new-arrivals"; no such section exists
            in the backend yet, so this renders nothing until an admin creates one. */}
        {apiData.newArrivalsLoading ? (
          <>
            <DsSectionHeader
              title="New arrivals"
              subtitle="Added to the trade catalogue this week"
              actionLabel="View all"
              onAction={goCategories}
            />
            <RailSkeleton />
          </>
        ) : newArrivals.length > 0 && (
          <>
            <DsSectionHeader
              title="New arrivals"
              subtitle="Added to the trade catalogue this week"
              actionLabel="View all"
              onAction={goCategories}
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
                  onSelectOption={() => setVariantSheetProduct(p)}
                  bulkQtyThreshold={bulkQtyThreshold}
                />
              ))}
            </ScrollView>
          </>
        )}

        {/* Promo banner carousel - backed by GET /store/banners?target_type=home_promo, same
            image-only Banner model as the Hero carousel above (own admin-managed image set, not
            a re-display of the Hero banners). Read-only, not links to anything (previously
            navigated to a Listing/Categories/Stores screen; removed per instruction). Section
            renders nothing when there are no banners yet, matching the Hero carousel's own
            empty-state behavior. */}
        {apiData.promoBannersLoading ? (
          <View style={styles.promoRail}>
            <View style={[styles.promoCard, styles.promoImage, { backgroundColor: ds.line }]} />
          </View>
        ) : (
          apiData.promoBanners.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promoRail}>
              {apiData.promoBanners.map((pb) => (
                <View key={pb.id as string} style={styles.promoCard}>
                  <Image source={{ uri: pb.image_url as string }} style={styles.promoImage} contentFit="cover" />
                </View>
              ))}
            </ScrollView>
          )
        )}

        {/* Featured products - backed by product-sections slug "featured-product" */}
        {apiData.featuredLoading ? (
          <>
            <DsSectionHeader
              title="Featured products"
              actionLabel="View all"
              onAction={goCategories}
            />
            <RailSkeleton />
          </>
        ) : featured.length > 0 && (
          <>
            <DsSectionHeader
              title="Featured products"
              actionLabel="View all"
              onAction={goCategories}
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
                  onSelectOption={() => setVariantSheetProduct(p)}
                  bulkQtyThreshold={bulkQtyThreshold}
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
              onPress={goCategories}
              style={[styles.concernBanner, { backgroundColor: c.tint }]}
            >
              <View style={styles.concernIcon}>
                <ConcernLeafIcon size={19} />
              </View>
              <View style={styles.concernText}>
                <Text style={styles.concernTitle}>{c.title}</Text>
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
                  onSelectOption={() => setVariantSheetProduct(p)}
                  bulkQtyThreshold={bulkQtyThreshold}
                />
              ))}
            </ScrollView>
          </View>
        ))}

        {/* Doctor's Talk - real testimonials (Operations > Doctor's Talk in admin, see
            useDoctorTalks), replacing the old hardcoded doctorTalks array. Section hides
            entirely once loaded if there's nothing configured yet, same convention as Buy
            again/What buyers say. */}
        {doctorTalksApi.loading ? (
          <>
            <View style={styles.plainSectionHeader}>
              <Text style={styles.plainSectionTitle}>Doctor&apos;s Talk</Text>
              <Text style={styles.plainSectionSubtitle}>Trusted by practitioners who recommend us to their patients</Text>
            </View>
            <View style={styles.rail}>
              <Skeleton width={272} height={190} radius={dsRadii.sheet} />
              <Skeleton width={272} height={190} radius={dsRadii.sheet} />
            </View>
          </>
        ) : (
          doctorTalksApi.doctorTalks.length > 0 && (
            <>
              <View style={styles.plainSectionHeader}>
                <Text style={styles.plainSectionTitle}>Doctor&apos;s Talk</Text>
                <Text style={styles.plainSectionSubtitle}>Trusted by practitioners who recommend us to their patients</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
                {doctorTalksApi.doctorTalks.map((d) => (
                  <View key={d.id} style={styles.doctorCard}>
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
            </>
          )
        )}

        {/* What buyers say - real approved reviews (GET /store/reviews, see useRecentReviews),
            replacing the old fully-invented testimonials. A rating-only review with no comment
            has no quote to show here, so it's skipped; section hides entirely once loaded if
            there's nothing to show, same convention as Buy again. */}
        {reviewsWithComment.length > 0 && (
          <>
            <View style={styles.plainSectionHeader}>
              <Text style={styles.plainSectionTitle}>What buyers say</Text>
              <Text style={styles.plainSectionSubtitle}>Real feedback from people who order every week</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
              {reviewsWithComment.map((r) => (
                <View key={r.id} style={styles.reviewCard}>
                  <View style={styles.reviewStars}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Text key={n} style={[styles.reviewStar, n > r.rating && styles.reviewStarEmpty]}>★</Text>
                    ))}
                  </View>
                  <Text style={styles.reviewQuote}>{r.comment}</Text>
                  <View style={styles.testimonialFooter}>
                    <View style={styles.reviewAvatar}>
                      <Text style={styles.reviewAvatarText}>{r.customer_initials}</Text>
                    </View>
                    <View style={styles.testimonialNameBlock}>
                      <Text style={styles.testimonialName}>{r.customer_name}</Text>
                      {!!r.product_title && <Text style={styles.testimonialTag}>{r.product_title}</Text>}
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </>
        )}
      </ScrollView>

      <VariantSheet visible={!!variantSheetProduct} product={variantSheetProduct} onClose={() => setVariantSheetProduct(null)} />
    </View>
  );
}

// Reserves each section's real layout space while its own data is still in flight (see
// homeApi.ts's HomeApiData comment) - a horizontal row of card-shaped placeholders, sized to
// roughly match DsProductCard at the same 166 width used everywhere on this screen.
const RailSkeleton = React.memo(function RailSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.rail}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} width={166} height={248} radius={dsRadii.sheet} />
      ))}
    </View>
  );
});

const CategoryTilesSkeleton = React.memo(function CategoryTilesSkeleton() {
  return (
    <View style={styles.prescriptionGrid}>
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={styles.prescriptionTile}>
          <View style={[styles.prescriptionGlyphTile, { backgroundColor: ds.line }]} />
        </View>
      ))}
    </View>
  );
});

const BrandsRowSkeleton = React.memo(function BrandsRowSkeleton() {
  return (
    <View style={styles.brandsRow}>
      <View style={[styles.brandSkeletonCard, { backgroundColor: ds.line }]} />
      <View style={[styles.brandSkeletonCard, { backgroundColor: ds.line }]} />
    </View>
  );
});

// Own component (not inlined in the .map() above) purely so the increment button's loading
// state (real stock check, useApiCartActions' incApiProduct) can live per-row without a
// screen-level Set-of-checking-ids - same self-contained pattern DsProductCard's own stepper
// uses.
const FastMovingStepper = React.memo(function FastMovingStepper({
  qty,
  onInc,
  onDec,
  showBulkNudge,
  onOpenProduct,
}: {
  qty: number;
  onInc: () => void | Promise<void>;
  onDec: () => void;
  showBulkNudge: boolean;
  onOpenProduct: () => void;
}) {
  const [incChecking, setIncChecking] = useState(false);
  const handleInc = async () => {
    setIncChecking(true);
    try {
      await onInc();
    } finally {
      setIncChecking(false);
    }
  };

  return (
    <View style={styles.fastMovingStepperWrap}>
      <View style={styles.fastMovingStepper}>
        <Pressable onPress={onDec} style={styles.fastMovingStepperBtn} hitSlop={4} disabled={incChecking}>
          {qty <= 1 ? <TrashIcon size={14} color={ds.dangerInk} /> : <Text style={styles.stepperGlyph}>−</Text>}
        </Pressable>
        <Text style={styles.fastMovingQty}>{qty}</Text>
        <Pressable onPress={handleInc} style={styles.fastMovingStepperBtn} hitSlop={4} disabled={incChecking}>
          {incChecking ? <ActivityIndicator size="small" color={ds.primaryInk} /> : <Text style={styles.stepperGlyph}>+</Text>}
        </Pressable>
      </View>
      {showBulkNudge && (
        <Pressable onPress={onOpenProduct}>
          <Text style={styles.fastMovingBulkNudge}>Buy in bulk on product page</Text>
        </Pressable>
      )}
    </View>
  );
});

const FastMovingSkeleton = React.memo(function FastMovingSkeleton() {
  return (
    <View style={styles.fastMovingList}>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} height={96} radius={dsRadii.button} />
      ))}
    </View>
  );
});

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
  prescriptionGlyphTile: { width: '100%', aspectRatio: 1, borderRadius: dsRadii.button, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  prescriptionImage: { width: '100%', height: '100%' },
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
  fastMovingPhoto: { width: 72, height: 72, borderRadius: dsRadii.input, backgroundColor: ds.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  fastMovingImage: { width: '100%', height: '100%' },
  fastMovingPhotoLabel: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink3 },
  fastMovingDiscountChip: {
    position: 'absolute',
    top: 4,
    left: 4,
    fontFamily: dsFontFamily[600],
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.18,
    backgroundColor: ds.surface,
    color: ds.primaryInk,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: dsRadii.chip,
    overflow: 'hidden',
  },
  fastMovingInfo: { flex: 1, minWidth: 0 },
  fastMovingName: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink },
  fastMovingUseCase: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink2, marginTop: 4 },
  fastMovingPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: dsSpacing.sm },
  fastMovingPrice: { fontFamily: dsFontFamily[700], fontSize: 14, lineHeight: 20, color: ds.primaryInk },
  fastMovingCompare: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink3, textDecorationLine: 'line-through' },
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
  fastMovingStepperWrap: { flexShrink: 0, alignItems: 'center' },
  fastMovingBulkNudge: {
    marginTop: 6,
    maxWidth: 104,
    fontFamily: dsFontFamily[400],
    fontSize: 11,
    lineHeight: 14,
    color: ds.primaryInk,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
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
  catalogueSkeletonBar: { width: 160, height: 12, borderRadius: dsRadii.chip, backgroundColor: 'rgba(255,255,255,.2)', marginTop: 6 },

  uspGrid: { flexDirection: 'row', gap: dsSpacing.sm, paddingHorizontal: dsSpacing.lg, paddingTop: dsSpacing.md },
  uspTile: { flex: 1, backgroundColor: ds.surface, borderWidth: 1, borderColor: ds.line, borderRadius: dsRadii.button, padding: dsSpacing.md, alignItems: 'center', ...dsElevation.e1 },
  uspIconTile: { width: 34, height: 34, borderRadius: dsRadii.button, alignItems: 'center', justifyContent: 'center' },
  uspLabel: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink, marginTop: dsSpacing.sm, textAlign: 'center' },

  rail: { flexDirection: 'row', gap: dsSpacing.md, paddingHorizontal: dsSpacing.lg, paddingTop: dsSpacing.md },

  brandsRow: { flexDirection: 'row', gap: dsSpacing.md, paddingHorizontal: dsSpacing.lg, paddingTop: dsSpacing.md },
  brandCard: { flex: 1, minWidth: 0, backgroundColor: ds.surface, borderWidth: 1, borderColor: ds.line, borderRadius: dsRadii.button, overflow: 'hidden', ...dsElevation.e1 },
  brandSkeletonCard: { flex: 1, minWidth: 0, height: 168, borderRadius: dsRadii.button },
  brandImage: { aspectRatio: 4 / 3, backgroundColor: ds.primarySoft, justifyContent: 'flex-end', padding: 8 },
  brandRealImage: { ...StyleSheet.absoluteFillObject },
  brandImageLabel: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink3 },
  brandInitials: { position: 'absolute', top: 8, left: 8, width: 32, height: 32, borderRadius: dsRadii.input, backgroundColor: ds.surface, alignItems: 'center', justifyContent: 'center' },
  brandInitialsText: { fontFamily: dsFontFamily[600], fontSize: 11, lineHeight: 14, letterSpacing: 0.22, color: ds.primaryInk },
  brandBody: { padding: dsSpacing.md, gap: 4 },
  brandName: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink },
  brandLine: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink2 },
  brandSkus: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.primaryInk, marginTop: 4 },

  promoRail: { flexDirection: 'row', gap: dsSpacing.sm, paddingHorizontal: dsSpacing.sm, paddingTop: dsSpacing.lg },
  promoCard: { width: 272, borderRadius: dsRadii.sheet, overflow: 'hidden' },
  promoImage: { width: '100%', aspectRatio: 16 / 9 },

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
  reviewStarEmpty: { color: ds.line },
  reviewQuote: { fontFamily: dsFontFamily[400], fontSize: 14, lineHeight: 21, color: ds.ink, marginTop: dsSpacing.md },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: ds.canvas, alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink },
});
