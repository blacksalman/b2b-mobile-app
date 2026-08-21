import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fontFamily } from '@/theme';
import { Header } from '@/components/shell/Header';
import { SectionHeader } from '@/components/composite/SectionHeader';
import { ProductCard } from '@/components/composite/ProductCard';
import { BrandCard } from '@/components/composite/BrandCard';
import { ConcernShelf } from '@/components/composite/ConcernShelf';
import { TestimonialCard } from '@/components/composite/TestimonialCard';
import { ArrowRightIcon, CheckIcon, TrendUpIcon } from '@/icons';
import { useAppState } from '@/state/AppStateContext';
import {
  brands,
  buyerReviews,
  doctorTalks,
  fastMoving,
  getBestSellers,
  getBuyAgain,
  getConcerns,
  getFeatured,
  getNewArrivals,
  prescriptionGroups,
  promoBanners,
} from '@/data/home-content';
import { productById } from '@/data/products';

function addFlashLabel(name: string): string {
  return name.split(' ').slice(0, 2).join(' ') + ' added';
}

export default function HomeScreen() {
  const router = useRouter();
  const { cart, loggedIn, addToCart, inc, dec, flash } = useAppState();

  const buyAgain = getBuyAgain(cart, loggedIn);
  const bestSellers = getBestSellers(cart, loggedIn);
  const newArrivals = getNewArrivals(cart, loggedIn);
  const featured = getFeatured(cart, loggedIn);
  const concerns = getConcerns(cart, loggedIn);

  const openProduct = (id: number) => router.push(`/product/${id}`);
  const addProduct = (id: number) => {
    const p = productById(id);
    addToCart(id, 1);
    if (p) flash(addFlashLabel(p.name));
  };
  const goCart = () => router.push('/cart');
  const goLogin = () => router.push('/account');
  const goCategory = (name: string) => router.push(`/category/${encodeURIComponent(name)}`);
  const goBrand = (name: string) => router.push(`/brand/${encodeURIComponent(name)}`);

  const handlePromoBanner = (b: (typeof promoBanners)[number]) => {
    if ('targetCategory' in b && b.targetCategory) return goCategory(b.targetCategory);
    if ('targetScreen' in b && b.targetScreen === 'categories') return router.push('/categories');
    if ('targetScreen' in b && b.targetScreen === 'stores') return router.push('/stores');
  };

  return (
    <View style={styles.screen}>
      <Header />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero promo */}
        <View style={styles.hero}>
          <View style={styles.heroCircle} />
          <View>
            <Text style={styles.heroEyebrow}>TRADE PRICE · CASE ORDERS</Text>
            <Text style={styles.heroTitle}>Immunity & Wellness</Text>
            <Text style={styles.heroSub}>Up to 50% off your first carton order. Next-day dispatch before 9am.</Text>
            <Pressable onPress={() => router.push('/deals')} style={styles.heroButton}>
              <Text style={styles.heroButtonText}>Discover now</Text>
              <ArrowRightIcon size={14} />
            </Pressable>
          </View>
          <View style={styles.heroDots}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>

        {/* Level Up Program — decorative/static per source, not wired to real tier logic */}
        <Pressable onPress={() => router.push('/deals')} style={styles.levelUp}>
          <View style={styles.levelUpTop}>
            <View style={styles.levelUpBadge}>
              <View style={styles.levelUpBadgeIcon}>
                <CheckIcon size={12} />
              </View>
              <Text style={styles.levelUpBadgeText}>LEVEL UP PROGRAM</Text>
            </View>
            <View style={styles.levelUpTopRight}>
              <View style={styles.percentCircle}>
                <Text style={styles.percentText}>%</Text>
              </View>
              <TrendUpIcon size={22} />
            </View>
          </View>
          <View style={styles.levelUpStatsRow}>
            <View>
              <Text style={styles.levelUpLabel}>High margin · up to</Text>
              <Text style={styles.levelUpStat}>
                <Text style={{ color: colors.brandGreen }}>63%</Text> profit
              </Text>
              <Text style={styles.levelUpFootnote}>on 240 stocked lines when you buy by the carton</Text>
            </View>
            <View style={styles.barsRow}>
              <View style={[styles.bar, { height: 22, backgroundColor: colors.mintTint }]} />
              <View style={[styles.bar, { height: 32, backgroundColor: 'rgba(37,165,103,.45)' }]} />
              <View style={[styles.bar, { height: 44, backgroundColor: 'rgba(37,165,103,.7)' }]} />
              <View style={[styles.bar, { height: 58, backgroundColor: colors.brandGreen }]} />
            </View>
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.stars}>★★★</Text>
            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>
            <Text style={styles.tierText}>Tier 3 unlocks at ₹6k</Text>
          </View>
        </Pressable>

        {/* Prescription at a glance */}
        <SectionHeader
          title="Prescription at a glance"
          subtitle="Curated product groups for common prescriptions"
          actionLabel="View all"
          onAction={() => goCategory('Health supplement')}
        />
        <View style={styles.prescriptionGrid}>
          {prescriptionGroups.map((g) => (
            <Pressable key={g.name} onPress={() => goCategory('Health supplement')} style={styles.prescriptionCard}>
              <View style={[styles.prescriptionIcon, { borderColor: g.icon }]}>
                <Text style={[styles.prescriptionGlyph, { color: g.icon }]}>{g.glyph}</Text>
              </View>
              <Text style={styles.prescriptionName}>{g.name}</Text>
              <Text style={styles.prescriptionCount}>{g.count} products</Text>
            </Pressable>
          ))}
        </View>

        {/* Fast-moving offers */}
        <SectionHeader title="Fast-moving offers" subtitle="Price, pack and use case in one glance" />
        <View style={styles.fastMovingList}>
          {fastMoving.map((m) => (
            <View key={m.name} style={styles.fastMovingRow}>
              <Pressable onPress={() => openProduct(m.pid)} style={[styles.fastMovingSwatch, { backgroundColor: m.tint }]} />
              <View style={styles.fastMovingInfo}>
                <Text style={styles.fastMovingName}>{m.name}</Text>
                <Text style={styles.fastMovingUseCase}>{m.useCase}</Text>
                <View style={styles.fastMovingChips}>
                  <View style={styles.fastMovingChip}>
                    <Text style={styles.fastMovingChipText}>{m.pack}</Text>
                  </View>
                  <View style={[styles.fastMovingChip, { backgroundColor: 'rgba(217,169,78,.16)' }]}>
                    <Text style={[styles.fastMovingChipText, { color: colors.charcoal }]}>{m.price}</Text>
                  </View>
                </View>
              </View>
              <Pressable
                onPress={() => {
                  addToCart(m.pid, 1);
                  flash(m.name + ' added');
                }}
                style={styles.fastMovingAdd}
              >
                <Text style={styles.fastMovingAddGlyph}>+</Text>
              </Pressable>
            </View>
          ))}
        </View>

        {/* Explore full catalogue CTA */}
        <View style={styles.catalogueBand}>
          <Text style={styles.catalogueEyebrow}>300+ PRODUCTS</Text>
          <Text style={styles.catalogueTitle}>Explore the full catalogue</Text>
          <Text style={styles.catalogueSub}>Browse every pack, compare prices, and order with verified trade access.</Text>
          <View style={styles.catalogueButtons}>
            <Pressable onPress={() => router.push('/categories')} style={[styles.catalogueButton, { backgroundColor: colors.brandGreen }]}>
              <Text style={[styles.catalogueButtonText, { color: colors.white }]}>Browse catalogue</Text>
            </Pressable>
            <Pressable onPress={goLogin} style={[styles.catalogueButton, { backgroundColor: colors.white }]}>
              <Text style={[styles.catalogueButtonText, { color: colors.forestGreen }]}>Profile</Text>
            </Pressable>
          </View>
        </View>

        {/* Buy again */}
        <SectionHeader title="Buy again" subtitle="Ordered at least twice in the last 90 days" actionLabel="View all" onAction={() => router.push('/wishlist')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
          {buyAgain.map((p) => (
            <ProductCard
              key={p.id}
              variant="rail"
              product={p}
              priceMode="standard"
              topBadge={{ text: `${p.times}× ordered`, background: colors.mintTint, color: colors.brandGreen }}
              onOpen={() => openProduct(p.id)}
              onAdd={() => addProduct(p.id)}
              onInc={() => inc(p.id)}
              onDec={() => dec(p.id)}
              onGoCart={goCart}
              onLogin={goLogin}
            />
          ))}
        </ScrollView>

        {/* Brands to know */}
        <SectionHeader title="Brands to know" subtitle="Direct trade partners, no middle margin" actionLabel="All brands" onAction={() => router.push('/categories')} />
        <View style={styles.brandsList}>
          {brands.map((b) => (
            <BrandCard key={b.name} {...b} onShop={() => goBrand(b.name)} />
          ))}
        </View>

        {/* Best sellers */}
        <SectionHeader title="Best sellers" subtitle="Top-moving cases across every outlet" actionLabel="View all" onAction={() => router.push('/deals')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
          {bestSellers.map((p) => (
            <ProductCard
              key={p.id}
              variant="rail"
              product={p}
              priceMode="standard"
              topBadge={{ text: `#${p.rank} best seller`, background: colors.gold, color: colors.charcoal }}
              onOpen={() => openProduct(p.id)}
              onAdd={() => addProduct(p.id)}
              onInc={() => inc(p.id)}
              onDec={() => dec(p.id)}
              onGoCart={goCart}
              onLogin={goLogin}
            />
          ))}
        </ScrollView>

        {/* New arrivals */}
        <SectionHeader title="New arrivals" subtitle="Added to the trade catalogue this week" actionLabel="View all" onAction={() => router.push('/categories')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
          {newArrivals.map((p) => (
            <ProductCard
              key={p.id}
              variant="rail"
              product={p}
              priceMode="standard"
              topBadge={{ text: 'New', background: colors.purple, color: colors.white }}
              onOpen={() => openProduct(p.id)}
              onAdd={() => addProduct(p.id)}
              onInc={() => inc(p.id)}
              onDec={() => dec(p.id)}
              onGoCart={goCart}
              onLogin={goLogin}
            />
          ))}
        </ScrollView>

        {/* Promo banner carousel */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promoRail}>
          {promoBanners.map((pb) => (
            <Pressable key={pb.title} onPress={() => handlePromoBanner(pb)} style={[styles.promoCard, { backgroundColor: pb.tint }]}>
              <Text style={[styles.promoEyebrow, { color: pb.accent }]}>{pb.eyebrow}</Text>
              <Text style={styles.promoTitle}>{pb.title}</Text>
              <Text style={styles.promoSub}>{pb.sub}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Featured products */}
        <SectionHeader title="Featured products" subtitle="Hand-picked by your account manager." actionLabel="View all" onAction={() => router.push('/categories')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
          {featured.map((p) => (
            <ProductCard
              key={p.id}
              variant="rail"
              product={p}
              priceMode="offerSplit"
              offer={{ hasOffer: p.hasOffer, noOffer: p.noOffer }}
              onOpen={() => openProduct(p.id)}
              onAdd={() => addProduct(p.id)}
              onInc={() => inc(p.id)}
              onDec={() => dec(p.id)}
              onGoCart={goCart}
              onLogin={goLogin}
            />
          ))}
        </ScrollView>

        {/* Concern shelves */}
        {concerns.map((c) => (
          <ConcernShelf
            key={c.title}
            concern={c}
            onView={() => goCategory(c.cat)}
            onOpenProduct={openProduct}
            onAdd={addProduct}
            onInc={inc}
            onDec={dec}
            onGoCart={goCart}
            onLogin={goLogin}
          />
        ))}

        {/* Doctor's Talk */}
        <View style={styles.sectionTextBlock}>
          <Text style={styles.sectionTitle}>Doctor&apos;s Talk</Text>
          <Text style={styles.sectionSubtitle}>Trusted by practitioners who recommend us to their patients</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
          {doctorTalks.map((d) => (
            <TestimonialCard key={d.name} kind="doctor" quote={d.quote} name={d.name} title={d.title} initials={d.initials} />
          ))}
        </ScrollView>

        {/* What buyers say */}
        <View style={styles.sectionTextBlock}>
          <Text style={styles.sectionTitle}>What buyers say</Text>
          <Text style={styles.sectionSubtitle}>Real feedback from people who order every week</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
          {buyerReviews.map((r) => (
            <TestimonialCard key={r.name} kind="buyer" quote={r.quote} name={r.name} tag={r.tag} initials={r.initials} />
          ))}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cardBg },
  scrollContent: { paddingBottom: 24 },

  hero: {
    margin: 14,
    marginTop: 12,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.mintTint,
    padding: 20,
    paddingBottom: 20,
    paddingTop: 22,
  },
  heroCircle: {
    position: 'absolute',
    right: -30,
    top: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,.22)',
  },
  heroEyebrow: { fontFamily: fontFamily[600], fontSize: 10, letterSpacing: 1.4, color: colors.forestGreen },
  heroTitle: { fontFamily: fontFamily[700], fontSize: 25, lineHeight: 29, color: colors.orange, marginTop: 7 },
  heroSub: { fontFamily: fontFamily[400], fontSize: 12.5, color: colors.bodyGray, marginTop: 6, maxWidth: 210 },
  heroButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.brandGreen,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  heroButtonText: { fontFamily: fontFamily[600], fontSize: 12.5, color: colors.white },
  heroDots: { flexDirection: 'row', gap: 5, marginTop: 16 },
  dot: { width: 8, height: 3, borderRadius: 2, backgroundColor: 'rgba(37,165,103,.3)' },
  dotActive: { width: 22, backgroundColor: colors.brandGreen },

  levelUp: {
    marginHorizontal: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 18,
    padding: 16,
  },
  levelUpTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  levelUpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.brandGreen,
    borderRadius: 999,
    paddingVertical: 5,
    paddingRight: 12,
    paddingLeft: 5,
  },
  levelUpBadgeIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  levelUpBadgeText: { fontFamily: fontFamily[700], fontSize: 10, color: colors.white, letterSpacing: 0.8 },
  levelUpTopRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  percentCircle: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.8, borderColor: colors.brandGreen, alignItems: 'center', justifyContent: 'center' },
  percentText: { fontFamily: fontFamily[700], fontSize: 12, color: colors.brandGreen },
  levelUpStatsRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginTop: 13 },
  levelUpLabel: { fontFamily: fontFamily[400], fontSize: 12.5, color: colors.bodyGray },
  levelUpStat: { fontFamily: fontFamily[700], fontSize: 25, color: colors.charcoal, marginTop: 2 },
  levelUpFootnote: { fontFamily: fontFamily[400], fontSize: 10.5, color: colors.bodyGray, marginTop: 4 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  bar: { width: 11, borderRadius: 3 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  stars: { fontFamily: fontFamily[600], fontSize: 11, color: colors.starYellow, letterSpacing: 1.3 },
  progressTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.mintTint, overflow: 'hidden' },
  progressFill: { width: '62%', height: 5, backgroundColor: colors.brandGreen },
  tierText: { fontFamily: fontFamily[600], fontSize: 10.5, color: colors.brandGreen },

  prescriptionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  prescriptionCard: {
    flexBasis: '31%',
    flexGrow: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 15,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  prescriptionIcon: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.6, alignItems: 'center', justifyContent: 'center' },
  prescriptionGlyph: { fontFamily: fontFamily[700], fontSize: 14 },
  prescriptionName: { fontFamily: fontFamily[500], fontSize: 11, lineHeight: 14, color: colors.charcoal, marginTop: 9, minHeight: 28, textAlign: 'center' },
  prescriptionCount: { fontFamily: fontFamily[400], fontSize: 10, color: colors.bodyGray },

  fastMovingList: { paddingHorizontal: 14, paddingTop: 12, gap: 9 },
  fastMovingRow: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 16,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  fastMovingSwatch: { width: 62, height: 62, borderRadius: 12 },
  fastMovingInfo: { flex: 1, minWidth: 0 },
  fastMovingName: { fontFamily: fontFamily[600], fontSize: 12.5, lineHeight: 16, color: colors.charcoal },
  fastMovingUseCase: { fontFamily: fontFamily[400], fontSize: 10.5, color: colors.bodyGray, marginTop: 2 },
  fastMovingChips: { flexDirection: 'row', gap: 6, marginTop: 7 },
  fastMovingChip: { backgroundColor: colors.mintTint, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  fastMovingChipText: { fontFamily: fontFamily[600], fontSize: 10, color: colors.brandGreen },
  fastMovingAdd: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brandGreen, alignItems: 'center', justifyContent: 'center' },
  fastMovingAddGlyph: { color: colors.white, fontSize: 20, fontFamily: fontFamily[400], marginTop: -2 },

  catalogueBand: {
    margin: 14,
    marginTop: 20,
    borderRadius: 18,
    backgroundColor: colors.mintTint,
    padding: 20,
    alignItems: 'center',
  },
  catalogueEyebrow: { fontFamily: fontFamily[600], fontSize: 10.5, letterSpacing: 1.3, color: colors.forestGreen },
  catalogueTitle: { fontFamily: fontFamily[700], fontSize: 21, color: colors.charcoal, marginTop: 8, textAlign: 'center' },
  catalogueSub: { fontFamily: fontFamily[400], fontSize: 12, lineHeight: 18, color: colors.bodyGray, marginTop: 8, textAlign: 'center' },
  catalogueButtons: { flexDirection: 'row', gap: 9, marginTop: 15, alignSelf: 'stretch' },
  catalogueButton: { flex: 1, height: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  catalogueButtonText: { fontFamily: fontFamily[600], fontSize: 12.5 },

  rail: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 2 },

  brandsList: { paddingHorizontal: 14, paddingTop: 12, gap: 10 },

  promoRail: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingTop: 20, paddingBottom: 2 },
  promoCard: { width: 270, borderRadius: 16, padding: 16 },
  promoEyebrow: { fontFamily: fontFamily[600], fontSize: 10, letterSpacing: 1 },
  promoTitle: { fontFamily: fontFamily[700], fontSize: 16, lineHeight: 20, color: colors.charcoal, marginTop: 6 },
  promoSub: { fontFamily: fontFamily[400], fontSize: 11, lineHeight: 16.5, color: colors.bodyGray, marginTop: 5 },

  sectionTextBlock: { paddingHorizontal: 14, paddingTop: 22 },
  sectionTitle: { fontFamily: fontFamily[700], fontSize: 19, color: colors.charcoal },
  sectionSubtitle: { fontFamily: fontFamily[400], fontSize: 11.5, color: colors.bodyGray, marginTop: 2 },
});
