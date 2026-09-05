import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
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
import { buildVariantPacks, VariantSheet } from '@/components/shell/VariantSheet';
import { productById } from '@/data/products';
import {
  brandAbout,
  brandLegalName,
  brandStats,
  brandUsps,
  bulkTiersFor,
  bulkUnitPrice,
  hasBulkTiers,
  getAlsoBought,
  getSimilarProducts,
  productDescriptionFor,
  productSpecsFor,
} from '@/data/product-detail-content';
import { money } from '@/utils/money';
import { stripHtml } from '@/utils/stripHtml';
import { useAppState } from '@/state/AppStateContext';
import { StubScreen } from '@/components/shell/StubScreen';
import { useProductDetail } from '@/data/productDetailApi';
import { toProduct, toRailProduct, toVariantProduct } from '@/data/homeApi';
import { productHref } from '@/data/idHash';
import { syncCartQuantity, getVariantIdByHashId } from '@/data/cartSync';
import { useApiCartActions } from '@/data/useApiCartActions';
import { fetchDeliveryEstimate, fetchVariantStock } from '@/lib/medusaClient';
import { useReviewSummaries, useProductReviews, summaryFor } from '@/data/reviewsApi';
import { usePolicies } from '@/data/account-content';
import { PolicySheet } from '@/components/shell/PolicySheet';
import { timeAgo } from '@/utils/timeAgo';
import type { Product } from '@/data/types';
import type { RailProduct } from '@/data/home-content';

const TRUST_BADGES = [
  { name: 'GST Invoice', Icon: GstInvoiceIcon },
  { name: 'Genuine Product', Icon: GenuineCheckIcon },
  { name: 'Easy Returns', Icon: EasyReturnsIcon },
  { name: 'AYUSH Licensed', Icon: AyushLicenseIcon },
] as const;

// Gallery carousel geometry. The active photo is deliberately narrower than the screen so a
// slice of the next one stays visible at the right edge - that peek is what tells the user the
// gallery is swipeable at all, instead of the old one-photo-at-a-time view where the thumbnail
// strip was the only way to discover there were more images.
const GALLERY_SIDE = dsSpacing.lg;
const GALLERY_GAP = dsSpacing.sm;
const GALLERY_PEEK = 44;

const PRODUCT_TABS = ['Description', 'Specifications', 'Reviews'] as const;
type ProductTab = (typeof PRODUCT_TABS)[number];

function addFlashLabel(name: string): string {
  return name.split(' ').slice(0, 2).join(' ') + ' added';
}

interface ManufacturerInfo {
  stats: { value: string; label: string }[];
  usps: string[];
  about: string;
}

// Reads the real product's own collection.metadata.manufacturer (set by the admin's
// "About the manufacturer" widget on the collection, manufacturer-info.tsx) - null whenever it
// hasn't been configured for this product's collection, which hides the whole section below
// rather than showing an empty/broken card. Only used for real products; the mock catalog path
// keeps its own always-on static content unchanged (see this file's own top comment).
function parseManufacturerInfo(raw: unknown): ManufacturerInfo | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as any;
  const about = typeof r.about === 'string' ? r.about.trim() : '';
  if (!about) return null;
  const stats = Array.isArray(r.stats)
    ? r.stats
        .filter((s: any) => s && typeof s.value === 'string' && s.value.trim() && typeof s.label === 'string' && s.label.trim())
        .map((s: any) => ({ value: s.value.trim(), label: s.label.trim() }))
    : [];
  const usps = Array.isArray(r.usps) ? r.usps.filter((u: any) => typeof u === 'string' && u.trim()).map((u: string) => u.trim()) : [];
  return { stats, usps, about };
}

// Rebuilt against the new AyurvedaOne design system (Various Mobile App - Phone.dc.html, `isProduct`
// block + the global `showAddBar` sticky footer, which the new source renders OUTSIDE any per-screen
// sc-if — implemented here as a screen-local footer, matching this app's existing Checkout-screen
// pattern, since editing the shared `(tabs)/_layout.tsx` shell is out of scope this round). See the
// implementation report for the one known interaction this creates with the still-unmigrated
// MiniCartFab.
//
// Real-data version: an `id` param that isn't a mock catalog numeric id (ids 1-10 - Buy again/
// Fast-moving are still mock, everything else navigates here with the product's real handle,
// e.g. "/product/nurall-capsule-60caps-ayurveda-one-8104" - see idHash.ts's productHref) is
// fetched directly by handle via useProductDetail (productDetailApi.ts), which also pulls the
// product's /scheme cross-sell lists. Fetching by handle (not through productRegistry) is
// deliberate - it's what makes a cold page load or a refresh work, not just navigating in from
// a card that already rendered this session. `product` below is the SAME Product shape either
// way (toProduct adapts a real MedusaProduct into it) - everything downstream (bulk tiers,
// hasOffer/price, specs) already worked off this shape and needed no changes. What's still mock
// either way: bulk-tier pricing (a 0.94 formula, not real quantity-break pricing), the pincode
// delivery check, rating/review content, and the "About the manufacturer" static blurb - none
// of those have a real backend source (see the filter/Home-page wiring conversations for the
// same conclusion elsewhere).
export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cart, loggedIn, addToCart, inc, dec, setQty, flash, bulkQtyThreshold, supportPhone } = useAppState();

  // `id` is either a mock catalog numeric id (Buy again/Fast-moving/Listing still link that way)
  // or a real product's handle (every other screen's cards - see idHash.ts's productHref).
  // Number("some-handle") is NaN, so productById correctly finds nothing for a real handle.
  const mockProduct = productById(Number(id));
  const detail = useProductDetail(mockProduct ? null : id);
  const { addApiProduct, incApiProduct, decApiProduct } = useApiCartActions();

  const product: Product | undefined = mockProduct ?? (detail.product ? toProduct(detail.product) : undefined);
  const isReal = !mockProduct && !!product?.medusaId;
  const manufacturerInfo = mockProduct ? null : parseManufacturerInfo(detail.product?.collection?.metadata?.manufacturer);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPick, setLightboxPick] = useState(0);
  const galleryRef = useRef<ScrollView>(null);
  const { width: windowWidth } = useWindowDimensions();
  const gallerySlideWidth = Math.max(160, windowWidth - GALLERY_SIDE * 2 - GALLERY_PEEK);
  const gallerySnap = gallerySlideWidth + GALLERY_GAP;
  // Single entry point for "show image i": keeps the swipeable carousel, the pager dots, the
  // thumbnail strip and the lightbox all pointing at the same photo, whichever one the user
  // actually touched.
  const pickImage = useCallback(
    (i: number, scroll = true) => {
      setLightboxPick(i);
      if (scroll) galleryRef.current?.scrollTo({ x: i * gallerySnap, animated: true });
    },
    [gallerySnap],
  );
  const [wishlisted, setWishlisted] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const [productTab, setProductTab] = useState<ProductTab>('Description');
  const [pincode, setPincode] = useState('');
  const [pincodeResult, setPincodeResult] = useState('');
  // Bulk-quantity input (sits alongside the sticky add-bar's own +/- stepper, doesn't replace
  // it) - type any quantity, checked against real stock (GET /store/variants/:id/stock) before
  // it's actually set as the cart line's quantity. `checking` disables the button mid-request
  // rather than letting a second tap race the first.
  const [bulkQtyInput, setBulkQtyInput] = useState('');
  // `showSupport` is set only when the request failed because there genuinely isn't enough stock -
  // the one case where calling the team can actually get the customer what they asked for. The
  // other errors here (unparseable quantity, missing variant, a failed stock lookup) are not
  // things support can resolve, so offering a phone number there would just be noise.
  const [bulkQtyStatus, setBulkQtyStatus] = useState<{ type: 'error' | 'success'; message: string; showSupport?: boolean } | null>(null);
  const [bulkQtyChecking, setBulkQtyChecking] = useState(false);
  // Sticky add-bar's own +/- stepper (for `active`, not a rail card - see incMain below).
  const [mainIncChecking, setMainIncChecking] = useState(false);
  // Variant picker (product id 2 only) — screen-local, matching the pre-existing precedent in this
  // app (VariantSheet/Categories already keep `variantCart` screen-local, not global).
  const [variantPick, setVariantPick] = useState(0);
  const [variantQtyMap, setVariantQtyMap] = useState<Record<number, number>>({});
  // Real multi-variant picker (e.g. Swarnaprashana's 4 age-range packs) - a genuinely different
  // concept from the mock variantPick above (real variants have their own distinct price/stock,
  // not a quantity multiplier on one shared price). null = no explicit pick yet, meaning "use the
  // cheapest variant" (activeVariantProduct below falls back to that, same as every other real
  // product's card already does).
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [variantSheetProduct, setVariantSheetProduct] = useState<Product | null>(null);
  const { policies } = usePolicies();
  const [policyKey, setPolicyKey] = useState<string | null>(null);

  // Real rating/review-count aggregate (apps/backend's review module, reviewsApi.ts) for this
  // product plus its similar/also-bought rails, fetched as one batch. isReal's own product.medusaId
  // is undefined below on the very first render (product resolves before isReal is computed further
  // down) - reading it straight off `product` here instead avoids ordering this hook after isReal.
  const reviewProductIds = useMemo(() => {
    const ids = new Set<string>();
    if (product?.medusaId) ids.add(product.medusaId);
    detail.similarProducts.forEach((mp) => ids.add(mp.id));
    detail.alsoBoughtProducts.forEach((mp) => ids.add(mp.id));
    return Array.from(ids);
  }, [product?.medusaId, detail.similarProducts, detail.alsoBoughtProducts]);
  const reviewSummaries = useReviewSummaries(reviewProductIds);
  const mainReviewSummary = summaryFor(reviewSummaries, product?.medusaId);
  // Top-2 preview shown in the Reviews tab below (the full list lives on the dedicated Reviews
  // screen, product/[id]/reviews.tsx, which reuses this same hook with a higher limit).
  const productReviews = useProductReviews(product?.medusaId ?? null, 2);

  const similarProducts: RailProduct[] = useMemo(() => {
    if (!product) return [];
    if (mockProduct) return getSimilarProducts(product, cart, loggedIn);
    return detail.similarProducts.map((mp) => toRailProduct(mp, cart, loggedIn, reviewSummaries));
  }, [product, mockProduct, detail.similarProducts, cart, loggedIn, reviewSummaries]);
  const alsoBought: RailProduct[] = useMemo(() => {
    if (!product) return [];
    if (mockProduct) return getAlsoBought(product, cart, loggedIn);
    return detail.alsoBoughtProducts.map((mp) => toRailProduct(mp, cart, loggedIn, reviewSummaries));
  }, [product, mockProduct, detail.alsoBoughtProducts, cart, loggedIn, reviewSummaries]);
  const variantPacks = useMemo(() => (product ? buildVariantPacks(product) : []), [product]);
  // The real variant currently being shown/added - defaults to `product` itself (already the
  // cheapest variant, toProduct's existing behavior) until the customer picks a different one
  // from realVariants, at which point this swaps to that specific variant's own Product (price/
  // stock/quantityTiers all its own - see toVariantProduct in homeApi.ts). Every price/cart
  // computation below reads from this, not `product` directly, once a real multi-variant product
  // is in play.
  const activeVariantProduct = useMemo(() => {
    if (!product) return undefined;
    const hasRealVariants = isReal && (product.realVariants?.length ?? 0) > 1;
    if (!hasRealVariants || !detail.product) return product;
    const variantId = selectedVariantId ?? product.realVariants![0].id;
    return toVariantProduct(detail.product, variantId);
  }, [product, isReal, detail.product, selectedVariantId]);

  if (!product || !activeVariantProduct) {
    if (detail.loading) {
      return (
        <View style={[styles.screen, styles.loadingScreen]}>
          <Text style={dsType.body}>Loading product…</Text>
        </View>
      );
    }
    return <StubScreen title="Product detail" detail={`Product #${id}`} />;
  }

  const hasVariants = product.id === 2;
  // Real multi-variant product (e.g. Swarnaprashana's 4 age-range packs) - distinct from the
  // mock-only `hasVariants` above, which only ever applies to one specific seed product.
  const isRealMultiVariant = isReal && (product.realVariants?.length ?? 0) > 1;
  const active = activeVariantProduct; // the specific variant currently priced/added (see its own comment above)
  const gated = !!product.gated && !loggedIn; // never true for the current seed catalog
  // Real per-variant availability (homeApi.ts's toProduct/toVariantProduct) - undefined (mock
  // catalog) stays treated as in-stock, same convention as every other real-API-only field.
  const outOfStock = active.inStock === false;
  const cartQty = cart[active.id] || 0;
  const inCart = cartQty > 0;
  const bulkTiers = bulkTiersFor(active);
  // productSpecsFor's Form/Shelf life/Licence are fixed placeholder copy for every mock product
  // (see product-detail-content.ts) - fine for the mock catalog, but presenting them as fact for
  // a real product would be inventing specs that were never actually set. Real products show
  // just what's genuinely known (Brand, Pack size) instead of those three.
  const specs = mockProduct ? productSpecsFor(product) : [
    { k: 'Brand', v: product.brand },
    { k: 'Pack size', v: active.cs },
  ];
  const description = mockProduct
    ? productDescriptionFor(product)
    : stripHtml(detail.product?.description ?? '') || productDescriptionFor(product);

  const goBack = () => router.back();
  const goReviews = () => router.push(`${productHref(product)}/reviews`);
  const goCart = () => router.push('/cart');
  const goAccount = () => router.push('/account');
  const openReturnPolicy = () => setPolicyKey('returns');
  const openShippingPolicy = () => setPolicyKey('shipping');
  const closePolicy = () => setPolicyKey(null);
  const policy = policyKey ? policies.find((p) => p.key === policyKey) ?? null : null;
  const playBrandVideo = () => flash('Playing brand video');
  // The Policies section below only shows a row for a policy an admin has actually configured
  // (Operations > Policies) - previously rendered both rows unconditionally with hardcoded
  // summary copy that never reflected the real, admin-editable content at all.
  const returnsPolicy = policies.find((p) => p.key === 'returns') ?? null;
  const shippingPolicy = policies.find((p) => p.key === 'shipping') ?? null;

  const openProduct = (p: { id: number; handle?: string }) => router.push(productHref(p));
  const addProduct = (pid: number) => {
    const p = productById(pid);
    addToCart(pid, 1);
    if (p) flash(addFlashLabel(p.name));
  };
  // Similar products / People also bought: real (API-backed) items sync to the actual Medusa
  // cart via useApiCartActions, same as every other real product rail in the app; mock items
  // (only reachable when this page itself is showing a mock product) keep using the plain local
  // addProduct/inc/dec, unchanged from before.
  const railOnAdd = (p: RailProduct) => (mockProduct ? addProduct(p.id) : addApiProduct(p));
  const railOnInc = (p: RailProduct) => (mockProduct ? inc(p.id) : incApiProduct(p));
  const railOnDec = (p: RailProduct) => (mockProduct ? dec(p.id) : decApiProduct(p));

  // Real Delhivery TAT lookup (GET /store/delivery-tat), same one Ops' Dispatch/Tracking
  // pages sit downstream of - already accounts for IST dispatch cutoffs, so `message` is
  // ready to display as-is. storeFetch throws on a non-2xx response (the route uses 400 for a
  // malformed pincode, 502 for a real lookup failure), so those need a catch here rather than
  // reading `success` off a thrown error.
  const checkPincode = async () => {
    if (!/^\d{6}$/.test(pincode)) {
      setPincodeResult('Enter a valid 6-digit pincode');
      return;
    }
    setPincodeResult('Checking…');
    try {
      const estimate = await fetchDeliveryEstimate(pincode);
      setPincodeResult(estimate.message);
    } catch {
      setPincodeResult('Could not check delivery estimate for this pincode');
    }
  };

  // Bulk-quantity "Set quantity" - a fresh real-time stock lookup (not the app's own cached
  // inStock boolean, which only ever means ">0 somewhere") before actually setting the cart
  // line, so a request for more than what's on hand gets rejected with the real count rather
  // than silently overselling. `unlimited` (not inventory-tracked, or backorder allowed) skips
  // the count comparison entirely - any quantity is fine.
  const setBulkQuantity = async () => {
    const qty = parseInt(bulkQtyInput, 10);
    if (!Number.isFinite(qty) || qty <= 0) {
      setBulkQtyStatus({ type: 'error', message: 'Enter a whole number greater than 0' });
      return;
    }
    const variantId = getVariantIdByHashId(active.id);
    if (!variantId) {
      setBulkQtyStatus({ type: 'error', message: 'Could not verify stock for this product' });
      return;
    }
    setBulkQtyChecking(true);
    setBulkQtyStatus(null);
    try {
      const stock = await fetchVariantStock(variantId);
      if (stock.unlimited || (stock.available ?? 0) >= qty) {
        setQty(active.id, qty);
        syncCartQuantity(active.id, qty);
        setBulkQtyStatus({ type: 'success', message: `Set quantity to ${qty} and added to cart` });
        setBulkQtyInput('');
      } else {
        setBulkQtyStatus({
          type: 'error',
          // Ends mid-sentence on purpose - the support number is appended inline as a tappable
          // span in the render below, so the phrasing has to lead into it.
          message: `Only ${stock.available ?? 0} in stock - enter a smaller quantity, or arrange this quantity with us on`,
          showSupport: true,
        });
      }
    } catch {
      setBulkQtyStatus({ type: 'error', message: 'Could not check stock right now' });
    } finally {
      setBulkQtyChecking(false);
    }
  };

  // Ported from the source's `productAdd` (Various Mobile App - Phone.dc.html line 3066), minus
  // the forced "minimum 2" floor - that was a fabricated MOQ rule with no real backend rule
  // behind it. Always adds 1, same as every other Add button in this app, now that the separate
  // mid-page Quantity stepper (which used to let this add more than 1 at once) is gone. Calls no
  // `flash()`, unlike every other add-to-cart action in this app - preserved, not "fixed", it's
  // the source's own quirk. Real products additionally sync the real cart.
  const productAdd = () => {
    addToCart(active.id, 1);
    if (isReal) syncCartQuantity(active.id, cartQty + 1);
  };
  // A real, per-tap stock check (not the cached inStock boolean) before actually incrementing -
  // same check the rail cards' own incApiProduct does, duplicated here since this stepper works
  // off `active` directly rather than going through useApiCartActions (see its own comment on
  // why productAdd/decMain do the same). `mainIncChecking` drives the sticky bar's own spinner.
  const incMain = async () => {
    if (isReal) {
      const variantId = getVariantIdByHashId(active.id);
      if (variantId) {
        setMainIncChecking(true);
        try {
          const stock = await fetchVariantStock(variantId);
          const nextQty = cartQty + 1;
          if (!stock.unlimited && (stock.available ?? 0) < nextQty) {
            flash(`Only ${stock.available ?? 0} in stock`);
            return;
          }
        } catch {
          // Stock check itself failed - fall through and allow the increment rather than
          // blocking the user over a transient error unrelated to stock.
        } finally {
          setMainIncChecking(false);
        }
      }
    }
    inc(active.id);
    if (isReal) syncCartQuantity(active.id, cartQty + 1);
  };
  const decMain = () => {
    dec(active.id);
    if (isReal) syncCartQuantity(active.id, Math.max(0, cartQty - 1));
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

  // An MRP-vs-sale-price markdown (cmp) and quantity-tier pricing (quantityTiers, the admin's
  // separate "Quantity Discount" widget) are two independent real discount mechanisms - a
  // product can have real tiers with no MRP discount at all (confirmed live: this exact case),
  // or vice versa. barUnitPrice/referenceUnitPrice/showBarSavings/barSave below are qty-aware or
  // unified across the whole page - the top price block and the sticky add-bar both read from
  // `active` (the currently selected real variant, or `product` itself when there's only one),
  // not a flat, qty-unaware price/cmp - and not `product`'s own baseline once a different real
  // variant has been picked.
  const barQty = inCart ? cartQty : 1;
  // Real GST rate (active.taxRate, taxRates.ts) - this page computes its own price block
  // directly rather than going through decorateProduct's formatter, so it needs the same
  // tax-inclusive treatment applied here. hasBulkTiers/bulkUnitPrice still work off the raw
  // pre-tax base price/quantityTiers - tax is only folded in for the final display numbers.
  const taxMult = 1 + (active.taxRate ?? 0) / 100;
  const barUnitPrice = (hasBulkTiers(active) ? bulkUnitPrice(active, barQty) : active.price || 0) * taxMult;
  const referenceUnitPrice = (active.cmp || active.price || 0) * taxMult;
  const productLineTotal = money(barUnitPrice * barQty);
  const productLineMrp = money(referenceUnitPrice * barQty);
  const showBarSavings = referenceUnitPrice > 0 && barUnitPrice < referenceUnitPrice;
  const barSave = showBarSavings ? '-' + Math.round((1 - barUnitPrice / referenceUnitPrice) * 100) + '%' : '';

  // Real products carry real photo URLs (product.images, from Medusa's product.images relation -
  // usually more than one); the mock catalog never did (every screen just renders a solid-color
  // placeholder box), so `hasRealImages` false keeps that exact placeholder behavior unchanged,
  // 4 fake thumbnail slots included.
  const galleryImages = product.images ?? [];
  const hasRealImages = galleryImages.length > 0;
  const lightboxThumbs = hasRealImages ? galleryImages.map((_, i) => i) : [0, 1, 2, 3];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.headerRow, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={goBack} style={styles.backButton} hitSlop={4}>
            <SmallBackChevronIcon size={9} color={ds.ink} />
          </Pressable>
        </View>

        <View style={styles.photoWrap}>
          {/* Swipe-through gallery: snapping to gallerySnap (slide + gap) rather than paging on
              the full screen width is what leaves the next photo peeking at the edge while still
              landing each swipe exactly on one image. */}
          <ScrollView
            ref={galleryRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={gallerySnap}
            snapToAlignment="start"
            disableIntervalMomentum
            contentContainerStyle={styles.galleryContent}
            onMomentumScrollEnd={(e) => {
              const i = Math.round(e.nativeEvent.contentOffset.x / gallerySnap);
              // Sync the dots/thumbs to where the swipe landed, but don't scroll back - the
              // carousel is already there, and re-scrolling mid-gesture fights the user.
              pickImage(Math.max(0, Math.min(i, lightboxThumbs.length - 1)), false);
            }}
          >
            {lightboxThumbs.map((i) => (
              <Pressable
                key={i}
                onPress={() => setLightboxOpen(true)}
                style={[styles.photo, { width: gallerySlideWidth }]}
              >
                {hasRealImages && <Image source={{ uri: galleryImages[i] }} style={styles.photoImage} contentFit="cover" />}
              </Pressable>
            ))}
          </ScrollView>
          <Pressable onPress={() => setWishlisted((v) => !v)} style={styles.wishlistButton} hitSlop={4}>
            <HeartIcon size={16} color={ds.primaryInk} fill={wishlisted ? ds.primaryInk : 'none'} />
          </Pressable>
        </View>
        <View style={styles.dotsRow}>
          {lightboxThumbs.map((i) => (
            <View key={i} style={[styles.dot, { backgroundColor: lightboxPick === i ? ds.primaryInk : 'rgba(12,71,51,.28)' }]} />
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow} contentContainerStyle={styles.thumbRowContent}>
          {lightboxThumbs.map((i) => (
            <Pressable key={i} onPress={() => pickImage(i)} style={[styles.thumb, { borderColor: lightboxPick === i ? ds.primary : 'transparent' }]}>
              {hasRealImages && <Image source={{ uri: galleryImages[i] }} style={styles.thumbImage} contentFit="contain" />}
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.infoBlock}>
          <View style={styles.infoTopRow}>
            <Text style={styles.brand} numberOfLines={1}>{product.brand}</Text>
            <Pressable onPress={goReviews} style={styles.ratingPill} hitSlop={4}>
              <Text style={styles.ratingStar}>★</Text>
              <Text style={styles.ratingValue}>{mainReviewSummary.average.toFixed(1)}</Text>
              <Text style={styles.ratingCount}>({mainReviewSummary.count} reviews)</Text>
              <ChevronRightIcon size={12} color={ds.ink2} strokeWidth={2.2} />
            </Pressable>
          </View>
          <Text style={styles.name}>{product.name}</Text>
          {outOfStock && (
            <View style={styles.outOfStockBadge}>
              <Text style={styles.outOfStockBadgeText}>Out of stock</Text>
            </View>
          )}

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
                  {isRealMultiVariant && (
                    <View style={styles.variantGrid}>
                      {product.realVariants!.map((v) => {
                        const picked = v.id === (selectedVariantId ?? product.realVariants![0].id);
                        return (
                          <Pressable
                            key={v.id}
                            onPress={() => setSelectedVariantId(v.id)}
                            style={[styles.variantOption, { borderColor: picked ? ds.primary : ds.line, backgroundColor: picked ? ds.primarySoft : ds.surface }]}
                          >
                            <Text style={styles.variantOptionLabel}>{v.title}</Text>
                            <Text style={styles.variantOptionPrice}>{money(v.price)}</Text>
                            {v.inStock === false && <Text style={styles.variantOptionOutOfStock}>Out of stock</Text>}
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                  {/* With no variant grid between them, the price sits straight under the divider,
                      whose own marginVertical already supplies most of the gap - its full lg margin
                      on top of that left a 32pt hole above the price against 20 below. */}
                  {showBarSavings ? (
                    <>
                      <View style={[styles.priceRow, !isRealMultiVariant && styles.priceAfterDivider]}>
                        <Text style={styles.priceValue}>{money(barUnitPrice)}</Text>
                        <Text style={styles.priceCompare}>{money(referenceUnitPrice)}</Text>
                        <View style={styles.saveChip}>
                          <Text style={styles.saveChipText}>{barSave}</Text>
                        </View>
                      </View>
                      <Text style={styles.priceSubline}>per unit · incl. trade discount · inclusive of GST</Text>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.priceValueOnly, !isRealMultiVariant && styles.priceAfterDivider]}>{money(barUnitPrice)}</Text>
                      <Text style={styles.priceSubline}>MRP · per unit · inclusive of GST</Text>
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

        {hasBulkTiers(active) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bulk pricing</Text>
            {/* Full-bleed to the card's edges - the negative margins cancel its padding. */}
            <View style={styles.tiersBox}>
              {bulkTiers.map((tier) => (
                <View key={tier.label} style={[styles.tierRow, { backgroundColor: tier.rowBg }]}>
                  <Text style={[styles.tierLabel, { color: tier.labelColor }]}>{tier.label}</Text>
                  <Text style={[styles.tierPrice, styles.tierCellRight, { color: tier.labelColor }]}>{tier.price}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Bulk-quantity input - sits alongside the sticky add-bar's own +/- stepper (below,
            unchanged), doesn't replace it. Type any quantity, checked against a fresh real stock
            count (not the cached inStock boolean) before it's actually set as the cart line's
            quantity - see setBulkQuantity above. */}
        {isReal && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Buy in bulk</Text>
            <Text style={[dsType.meta, styles.bulkQtySubtitle]}>
              Need a large quantity? Enter it below - we'll check stock before adding it to your cart.
            </Text>
            <View style={styles.pincodeRow}>
              <View style={styles.pincodeInput}>
                <TextInput
                  value={bulkQtyInput}
                  onChangeText={(t) => {
                    setBulkQtyInput(t.replace(/[^0-9]/g, ''));
                    setBulkQtyStatus(null);
                  }}
                  placeholder="e.g. 100"
                  placeholderTextColor={ds.ink2}
                  style={styles.pincodeInputText}
                  keyboardType="number-pad"
                />
              </View>
              <Pressable onPress={setBulkQuantity} style={styles.checkButton} disabled={bulkQtyChecking}>
                <Text style={styles.checkButtonText}>{bulkQtyChecking ? 'Checking…' : 'Set quantity'}</Text>
              </Pressable>
            </View>
            {!!bulkQtyStatus && (
              <View style={[styles.pincodeResult, bulkQtyStatus.type === 'error' && styles.bulkQtyResultError]}>
                <Text
                  style={[styles.pincodeResultText, bulkQtyStatus.type === 'error' && styles.bulkQtyResultErrorText]}
                >
                  {bulkQtyStatus.message}
                  {/* Nested Text rather than a sibling Pressable so the number flows inline as the
                      end of the sentence instead of dropping onto its own line, while staying
                      tappable (onPress works on a nested Text in RN; a Pressable here would force a
                      block-level break). Admin-configurable (Settings > App Config), the same value
                      the order-confirmed screen shows, read from the app-config fetch
                      AppStateContext already makes at startup - so changing it in admin changes it
                      in both places. Tappable rather than plain text: a customer who has just been
                      told to call shouldn't have to retype the number. */}
                  {bulkQtyStatus.showSupport && (
                    <Text
                      style={styles.bulkQtySupportLink}
                      onPress={() => Linking.openURL(`tel:${supportPhone.replace(/[\s-]/g, '')}`)}
                    >
                      {' '}
                      {supportPhone}
                    </Text>
                  )}
                </Text>
              </View>
            )}
          </View>
        )}

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
                  <Text style={styles.reviewsAvg}>{mainReviewSummary.average.toFixed(1)}</Text>
                  <View>
                    <Text style={styles.reviewsStars}>★★★★★</Text>
                    <Text style={styles.reviewsCount}>{mainReviewSummary.count} reviews</Text>
                  </View>
                </View>
                <ChevronRightIcon size={14} color={ds.ink2} strokeWidth={2.2} />
              </Pressable>
              <View style={styles.reviewPreviewList}>
                {productReviews.reviews.map((r) => (
                  <View key={r.id} style={styles.reviewPreviewCard}>
                    <View style={styles.reviewPreviewHeader}>
                      <View style={styles.reviewAvatar}>
                        <Text style={styles.reviewAvatarText}>{r.customer_initials}</Text>
                      </View>
                      <View style={styles.reviewMeta}>
                        <Text style={styles.reviewerName}>{r.customer_name}</Text>
                        <Text style={styles.reviewDate}>{timeAgo(r.created_at)}</Text>
                      </View>
                      <View style={styles.reviewStarsChip}>
                        <StarIcon size={10} />
                        <Text style={styles.reviewStarsChipText}>{r.rating}</Text>
                      </View>
                    </View>
                    {r.comment && <Text style={styles.reviewPreviewText}>{r.comment}</Text>}
                  </View>
                ))}
              </View>
              <Pressable onPress={goReviews} style={styles.viewAllReviewsButton}>
                <Text style={styles.viewAllReviewsText}>View all reviews</Text>
              </Pressable>
            </View>
          )}
        </View>

        {similarProducts.length > 0 && (
          <>
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
                  onOpen={() => openProduct(p)}
                  onAdd={() => railOnAdd(p)}
                  onInc={() => railOnInc(p)}
                  onDec={() => railOnDec(p)}
                  onLogin={goAccount}
                  onSelectOption={() => setVariantSheetProduct(p)}
                  bulkQtyThreshold={bulkQtyThreshold}
                />
              ))}
            </ScrollView>
          </>
        )}

        {alsoBought.length > 0 && (
          <>
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
                  onOpen={() => openProduct(p)}
                  onAdd={() => railOnAdd(p)}
                  onInc={() => railOnInc(p)}
                  onDec={() => railOnDec(p)}
                  onLogin={goAccount}
                  onSelectOption={() => setVariantSheetProduct(p)}
                  bulkQtyThreshold={bulkQtyThreshold}
                />
              ))}
            </ScrollView>
          </>
        )}

        {(returnsPolicy || shippingPolicy) && (
          <>
            <View style={styles.sectionHeaderBlock}>
              <Text style={styles.sectionTitle}>Policies</Text>
              <Text style={styles.sectionSubtitle}>Returns, refunds and delivery terms</Text>
            </View>
            <View style={styles.card}>
              {returnsPolicy && (
                <>
                  <Text style={styles.policyHeading}>{returnsPolicy.title}</Text>
                  <Text style={styles.policyBody} numberOfLines={2}>
                    {stripHtml(returnsPolicy.body)}
                  </Text>
                  <Pressable onPress={openReturnPolicy} style={styles.learnMore}>
                    <Text style={styles.learnMoreText}>Learn more</Text>
                    <ChevronRightIcon size={12} color={ds.primaryInk} strokeWidth={2.2} />
                  </Pressable>
                </>
              )}
              {returnsPolicy && shippingPolicy && <View style={styles.divider} />}
              {shippingPolicy && (
                <>
                  <Text style={styles.policyHeading}>{shippingPolicy.title}</Text>
                  <Text style={styles.policyBody} numberOfLines={2}>
                    {stripHtml(shippingPolicy.body)}
                  </Text>
                  <Pressable onPress={openShippingPolicy} style={styles.learnMore}>
                    <Text style={styles.learnMoreText}>Learn more</Text>
                    <ChevronRightIcon size={12} color={ds.primaryInk} strokeWidth={2.2} />
                  </Pressable>
                </>
              )}
            </View>
          </>
        )}

        {(mockProduct || manufacturerInfo) && (
          <>
            <View style={styles.sectionHeaderBlock}>
              <Text style={styles.sectionTitle}>About the manufacturer</Text>
              <Text style={styles.sectionSubtitle}>Who makes this product</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.aboutTitle}>{mockProduct ? brandLegalName : product.brand || brandLegalName}</Text>
              {(mockProduct ? brandStats : manufacturerInfo!.stats).length > 0 && (
                <View style={styles.statsGrid}>
                  {(mockProduct ? brandStats : manufacturerInfo!.stats).map((s) => (
                    <View key={s.label} style={styles.statBox}>
                      <Text style={styles.statValue}>{s.value}</Text>
                      <Text style={styles.statLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              )}
              {(mockProduct ? brandUsps : manufacturerInfo!.usps).length > 0 && (
                <View style={styles.uspsRow}>
                  {(mockProduct ? brandUsps : manufacturerInfo!.usps).map((u) => (
                    <View key={u} style={styles.uspPill}>
                      <CheckThinIcon size={10} color={ds.primaryInk} />
                      <Text style={styles.uspText}>{u}</Text>
                    </View>
                  ))}
                </View>
              )}
              <View style={styles.divider} />
              <Text style={styles.policyBody}>{mockProduct ? brandAbout : manufacturerInfo!.about}</Text>
              <Pressable onPress={playBrandVideo} style={styles.videoBox}>
                <View style={styles.playButton}>
                  <PlayIcon size={16} color={ds.surface} />
                </View>
              </Pressable>
            </View>
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* No insets.bottom here: the TabBar rendered below this bar already pads for the home
          indicator (TabBar.tsx), so adding it again just made the bar bottom-heavy - 12 above
          the row, 12 + inset below it. Symmetric padding lives in the style now. */}
      <View style={styles.addBar}>
        <View style={styles.addBarInfo}>
          <View style={styles.addBarTotalRow}>
            <Text style={styles.addBarTotal}>{productLineTotal}</Text>
            {showBarSavings && (
              <>
                <Text style={styles.addBarMrp}>{productLineMrp}</Text>
                <View style={styles.saveChip}>
                  <Text style={styles.saveChipText}>{barSave}</Text>
                </View>
              </>
            )}
          </View>
        </View>
        {outOfStock ? (
          <View style={styles.addBarOutOfStock}>
            <Text style={styles.addBarOutOfStockText}>Out of stock</Text>
          </View>
        ) : inCart ? (
          <View style={styles.addBarStepper}>
            <Pressable onPress={decMain} style={styles.addBarStepBtn} hitSlop={4} disabled={mainIncChecking}>
              {cartQty <= 1 ? <TrashIcon size={14} color={ds.dangerInk} /> : <Text style={styles.stepGlyph}>−</Text>}
            </Pressable>
            <Text style={styles.stepQty}>{cartQty}</Text>
            <Pressable onPress={incMain} style={styles.addBarStepBtn} hitSlop={4} disabled={mainIncChecking}>
              {mainIncChecking ? <ActivityIndicator size="small" color={ds.primaryInk} /> : <Text style={styles.stepGlyph}>+</Text>}
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={productAdd} style={styles.addBarButton}>
            <CartIcon size={14} color={ds.surface} />
            <Text style={styles.addBarButtonText}>Add to Cart</Text>
          </Pressable>
        )}
      </View>

      {/* A Modal, not an absolutely-positioned View: the mini-cart FAB and tab bar are rendered by
          (tabs)/_layout.tsx as siblings of this screen, so no zIndex here can ever put the lightbox
          above them - they're in a different stacking context. A Modal renders in its own native
          window above the whole app, which is also what every other overlay in this app uses
          (FilterSheet, MiniCartSheet, PolicySheet). */}
      <Modal visible={lightboxOpen} transparent animationType="fade" onRequestClose={() => setLightboxOpen(false)}>
        <View style={[styles.lightbox, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={() => setLightboxOpen(false)} style={[styles.lightboxClose, { top: insets.top + 12 }]} hitSlop={8}>
            <CloseIcon size={20} color={ds.ink} strokeWidth={2.4} />
          </Pressable>
          <View style={styles.lightboxPhoto}>
            {hasRealImages && (
              <Image source={{ uri: galleryImages[lightboxPick] ?? galleryImages[0] }} style={styles.lightboxPhotoImage} contentFit="contain" />
            )}
          </View>
          <View style={styles.lightboxThumbs}>
            {lightboxThumbs.map((i) => (
              <Pressable key={i} onPress={() => pickImage(i)} style={[styles.lightboxThumb, { borderColor: lightboxPick === i ? ds.primary : 'transparent' }]}>
                {hasRealImages && <Image source={{ uri: galleryImages[i] }} style={styles.thumbImage} contentFit="contain" />}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      <VariantSheet visible={!!variantSheetProduct} product={variantSheetProduct} onClose={() => setVariantSheetProduct(null)} />
      <PolicySheet policy={policy} onClose={closePolicy} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ds.canvas },
  loadingScreen: { alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingBottom: 0 },
  headerRow: { flexShrink: 0, paddingHorizontal: dsSpacing.lg, paddingBottom: dsSpacing.md, backgroundColor: ds.surface, borderBottomWidth: 1, borderBottomColor: ds.line, flexDirection: 'row', alignItems: 'center', gap: dsSpacing.md },
  backButton: { width: 40, height: 40, borderRadius: dsRadii.pill, backgroundColor: ds.canvas, alignItems: 'center', justifyContent: 'center' },

  // Breathing room under the back bar - the gallery slides carry their own rounded corners now,
  // so sitting flush against that bar's bottom border read as a rendering glitch rather than
  // an edge-to-edge hero.
  photoWrap: { position: 'relative', paddingTop: dsSpacing.md },
  galleryContent: { flexDirection: 'row', gap: GALLERY_GAP, paddingHorizontal: GALLERY_SIDE },
  photo: { aspectRatio: 1, backgroundColor: ds.primarySoft, borderRadius: dsRadii.sheet, overflow: 'hidden' },
  photoImage: { width: '100%', height: '100%' },
  wishlistButton: { position: 'absolute', top: 12, right: dsSpacing.lg, width: 36, height: 36, borderRadius: dsRadii.pill, backgroundColor: ds.surface, boxShadow: '0 1px 2px rgba(12,71,51,.12)', alignItems: 'center', justifyContent: 'center' },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: dsSpacing.md },
  dot: { width: 6, height: 6, borderRadius: dsRadii.pill },
  // Was a plain flex row capped at maxWidth:280 with each thumb flex:1 - fine for the 4 fake
  // placeholder slots, but a real product with more than ~4 photos squeezed every thumbnail down
  // to fit that fixed width, unusably small. Fixed-size thumbnails in a horizontal scroll instead
  // - any real image count stays a normal, tappable size.
  thumbRow: { flexGrow: 0, marginTop: dsSpacing.sm },
  thumbRowContent: { flexDirection: 'row', gap: dsSpacing.sm, paddingHorizontal: dsSpacing.lg },
  thumb: { width: 64, height: 64, borderRadius: dsRadii.input, backgroundColor: ds.canvas, borderWidth: 1.5, overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%' },

  infoBlock: { marginTop: dsSpacing.md, paddingHorizontal: dsSpacing.lg },
  infoTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: dsSpacing.md },
  brand: { flexShrink: 1, ...dsType.meta },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingStar: { fontFamily: dsFontFamily[400], fontSize: 14, lineHeight: 21, color: ds.star },
  ratingValue: { fontFamily: dsFontFamily[600], fontSize: 11, lineHeight: 14, letterSpacing: 0.22, color: ds.ink },
  ratingCount: { ...dsType.meta },
  name: { ...dsType.h1, marginTop: 4 },
  outOfStockBadge: {
    alignSelf: 'flex-start',
    marginTop: dsSpacing.sm,
    backgroundColor: 'rgba(225,92,109,.12)',
    borderRadius: dsRadii.chip,
    paddingHorizontal: dsSpacing.sm,
    paddingVertical: 4,
  },
  outOfStockBadgeText: { fontFamily: dsFontFamily[600], fontSize: 12, lineHeight: 16, letterSpacing: 0.22, color: ds.dangerInk },
  divider: { height: 1, backgroundColor: ds.line, marginVertical: dsSpacing.md },

  variantGrid: { flexDirection: 'row', gap: dsSpacing.sm, marginTop: dsSpacing.md },
  variantOption: { flex: 1, borderRadius: dsRadii.button, borderWidth: 1.5, paddingVertical: dsSpacing.md, paddingHorizontal: dsSpacing.sm, alignItems: 'center' },
  variantOptionLabel: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink, textAlign: 'center' },
  variantOptionPrice: { fontFamily: dsFontFamily[700], fontSize: 14, lineHeight: 20, color: ds.primaryInk, marginTop: 4 },
  variantOptionOutOfStock: { fontFamily: dsFontFamily[600], fontSize: 11, lineHeight: 14, color: ds.dangerInk, marginTop: 2 },

  // lg above, matching the lg the trustGrid below leaves - the price block used to sit 12 from
  // what precedes it and 20 from the divider under it, so it read as belonging to the block
  // above rather than standing on its own.
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: dsSpacing.sm, marginTop: dsSpacing.lg },
  priceValue: { fontFamily: dsFontFamily[700], fontSize: 18, lineHeight: 24, color: ds.primaryInk },
  priceValueOnly: { fontFamily: dsFontFamily[700], fontSize: 18, lineHeight: 24, color: ds.primaryInk, marginTop: dsSpacing.lg },
  // sm, so that plus the divider's own md below it comes to the same lg the trustGrid leaves
  // under the price. Only for the no-variant layout - with a variant grid in between, the
  // price is not the divider's neighbour and keeps its full lg.
  priceAfterDivider: { marginTop: dsSpacing.sm },
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

  // overflow hidden so the full-bleed tier rows are clipped by the card's rounded corners
  // instead of squaring them off.
  card: { marginTop: dsSpacing.md, marginHorizontal: dsSpacing.lg, backgroundColor: ds.surface, borderWidth: 1, borderColor: ds.line, borderRadius: dsRadii.button, padding: dsSpacing.md, overflow: 'hidden', ...dsElevation.e1 },
  // dsType.h3, same as every sectionTitle on this screen - "Bulk pricing" was the one heading
  // still at 13/18, which read as a field label rather than a section of its own.
  cardTitle: { ...dsType.h3 },
  // Negative margins cancel the card's own padding so the table meets both edges, and the bottom
  // one lets the last row sit flush on the card's lower edge.
  tiersBox: {
    flexDirection: 'column',
    marginTop: dsSpacing.md,
    marginHorizontal: -dsSpacing.md,
    marginBottom: -dsSpacing.md,
  },
  tierCellRight: { textAlign: 'right' },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: dsSpacing.md, paddingHorizontal: dsSpacing.md, paddingVertical: dsSpacing.md, borderTopWidth: 1, borderTopColor: ds.line },
  // flex on both cells so the two columns line up row to row, rather than each row's split being
  // decided by its own text width.
  tierLabel: { flex: 1, minWidth: 0, fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20 },
  tierPrice: { flex: 1, minWidth: 0, fontFamily: dsFontFamily[700], fontSize: 14, lineHeight: 20 },


  sectionHeaderBlock: { paddingHorizontal: dsSpacing.lg, paddingTop: dsSpacing.xl },
  sectionTitle: { ...dsType.h3 },
  sectionSubtitle: { ...dsType.meta, marginTop: 4 },

  pincodeSection: { marginTop: dsSpacing.md, paddingHorizontal: dsSpacing.lg },
  pincodeRow: { flexDirection: 'row', gap: dsSpacing.sm },
  pincodeInput: { flex: 1, justifyContent: 'center', height: 48, backgroundColor: ds.surface, borderWidth: 1, borderColor: ds.lineStrong, borderRadius: dsRadii.input, paddingHorizontal: dsSpacing.md },
  pincodeInputText: { ...dsType.body, padding: 0 },
  checkButton: { flexShrink: 0, height: 48, paddingHorizontal: dsSpacing.lg, borderRadius: dsRadii.button, backgroundColor: ds.primaryStrong, alignItems: 'center', justifyContent: 'center' },
  checkButtonText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.surface },
  pincodeResult: { marginTop: dsSpacing.md, backgroundColor: ds.primarySoft, borderRadius: dsRadii.input, padding: dsSpacing.md },
  pincodeResultText: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.primaryInk },
  bulkQtySubtitle: { marginTop: 4, marginBottom: dsSpacing.md },
  bulkQtyResultError: { backgroundColor: ds.danger },
  bulkQtyResultErrorText: { color: ds.dangerInk },
  // Inline continuation of the error message, so it inherits that block's size/line-height and only
  // overrides weight and underline - enough to read as the tappable thing in an otherwise static
  // panel. No margin: any box spacing here would break the inline flow it's nested into.
  bulkQtySupportLink: {
    fontFamily: dsFontFamily[700],
    color: ds.dangerInk,
    textDecorationLine: 'underline',
  },

  tabsSection: { paddingHorizontal: dsSpacing.lg, paddingTop: dsSpacing.xl },
  tabsRow: { flexDirection: 'row', gap: dsSpacing.lg, borderBottomWidth: 1, borderBottomColor: ds.line },
  tab: { paddingBottom: dsSpacing.md, borderBottomWidth: 2 },
  tabText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20 },
  tabCard: { marginTop: dsSpacing.md, marginHorizontal: dsSpacing.lg, backgroundColor: ds.surface, borderWidth: 1, borderColor: ds.line, borderRadius: dsRadii.button, padding: dsSpacing.md, ...dsElevation.e1 },

  descBody: { ...dsType.body, color: ds.ink2 },
  descToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: dsSpacing.md },
  descToggleText: { fontFamily: dsFontFamily[600], fontSize: 13, lineHeight: 18, color: ds.primaryInk },

  // flex-start, not center: a value long enough to wrap (Pack size, typically) now sits with its
  // first line level with the key instead of the block being centred against it.
  specRow: { flexDirection: 'row', alignItems: 'flex-start', gap: dsSpacing.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: ds.line },
  specRowLast: { borderBottomWidth: 0 },
  // The key holds its width, the value takes the rest and wraps within it. Neither cell used to
  // flex at all, so a long Pack size simply ran past the row's right edge with nothing to
  // shrink or wrap against.
  specKey: { ...dsType.meta, flexShrink: 0 },
  specValue: { flex: 1, minWidth: 0, fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink, textAlign: 'right' },

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

  addBar: { flexShrink: 0, backgroundColor: ds.surface, borderTopWidth: 1, borderTopColor: ds.line, paddingHorizontal: dsSpacing.lg, paddingVertical: dsSpacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: dsSpacing.md, ...dsElevation.e2 },
  addBarInfo: { minWidth: 0 },
  addBarTotalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  addBarTotal: { fontFamily: dsFontFamily[700], fontSize: 18, lineHeight: 24, letterSpacing: -0.18, color: ds.ink },
  addBarMrp: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink3, textDecorationLine: 'line-through' },
  addBarButton: { flexShrink: 0, maxWidth: 220, height: 48, paddingHorizontal: dsSpacing.lg, borderRadius: dsRadii.button, backgroundColor: ds.primaryStrong, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: dsSpacing.sm },
  addBarButtonText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.surface },
  addBarOutOfStock: {
    flexShrink: 0,
    height: 48,
    paddingHorizontal: dsSpacing.lg,
    borderRadius: dsRadii.button,
    borderWidth: 1,
    borderColor: ds.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBarOutOfStockText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.ink3 },
  addBarStepper: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', height: 48, borderRadius: dsRadii.button, backgroundColor: ds.primarySoft },
  addBarStepBtn: { width: 40, height: 48, alignItems: 'center', justifyContent: 'center' },

  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,.72)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: dsSpacing.lg, paddingBottom: dsSpacing.lg },
  lightboxClose: { position: 'absolute', right: dsSpacing.lg, width: 44, height: 44, borderRadius: dsRadii.pill, backgroundColor: ds.surface, alignItems: 'center', justifyContent: 'center' },
  lightboxPhoto: { width: '100%', aspectRatio: 1, borderRadius: dsRadii.button, backgroundColor: ds.surface, overflow: 'hidden' },
  lightboxPhotoImage: { width: '100%', height: '100%' },
  lightboxThumbs: { flexDirection: 'row', gap: dsSpacing.sm, marginTop: dsSpacing.md },
  lightboxThumb: { width: 56, height: 56, borderRadius: dsRadii.input, backgroundColor: ds.surface, borderWidth: 1.5, overflow: 'hidden' },
});
