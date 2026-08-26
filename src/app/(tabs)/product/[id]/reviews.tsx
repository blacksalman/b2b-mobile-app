import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ds, dsElevation, dsFontFamily, dsRadii, dsSpacing, dsType } from '@/theme';
import { CloseIcon, SmallBackChevronIcon, StarIcon } from '@/icons';
import { productById } from '@/data/products';
import { useProductDetail } from '@/data/productDetailApi';
import { toProduct } from '@/data/homeApi';
import { useProductReviews, submitReview as postReview } from '@/data/reviewsApi';
import { timeAgo } from '@/utils/timeAgo';
import { useAppState } from '@/state/AppStateContext';

// Rebuilt against the new AyurvedaOne design system (Various Mobile App - Phone.dc.html, `isReviews`
// block). `goBack` still replicates the same genuine source quirk as before: the shared `goBack`
// handler special-cases `prev==='product'` to navigate Home instead of back to the Product page it was
// opened from (`goBack:()=>this.go(s.prev==='product'?'home':s.prev)`, line 2732; `goReviews` always
// sets `prev:'product'`, line 2663) — confirmed unchanged in the new source, so tapping back on
// Reviews still always lands on Home, never back on Product. Not a bug; replicated exactly.
//
// Real-data version: reviews (apps/backend's review module) are per real product, so `id` is
// resolved the same way product/[id].tsx already does (mock numeric id vs real handle - see
// idHash.ts) purely to get at `product.medusaId`, the id every review call below is keyed on.
export default function ReviewsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { flash, loggedIn } = useAppState();

  const mockProduct = productById(Number(id));
  const detail = useProductDetail(mockProduct ? null : id);
  const product = mockProduct ?? (detail.product ? toProduct(detail.product) : undefined);
  const productId = product?.medusaId ?? null;

  const { reviews, average, ratingCount, breakdown, refetch } = useProductReviews(productId, 20);

  const [writeReviewOpen, setWriteReviewOpen] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [reviewDraft, setReviewDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const goBack = () => router.push('/');
  const openWriteReview = () => {
    if (!loggedIn) {
      flash('Log in to write a review');
      return;
    }
    setMyRating(0);
    setReviewDraft('');
    setWriteReviewOpen(true);
  };
  const closeWriteReview = () => setWriteReviewOpen(false);
  const submitReview = async () => {
    if (submitting || !productId) return;
    if (myRating < 1) {
      flash('Please select a rating');
      return;
    }
    setSubmitting(true);
    const result = await postReview({ product_id: productId, rating: myRating, comment: reviewDraft.trim() || undefined });
    setSubmitting(false);
    if (result.ok) {
      setWriteReviewOpen(false);
      flash('Thanks — your review was submitted for moderation');
      refetch();
    } else {
      flash(result.message);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.headerRow, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={goBack} style={styles.backButton} hitSlop={0}>
          <View style={styles.backButtonInner}>
            <SmallBackChevronIcon size={9} color={ds.ink} />
          </View>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Ratings &amp; Reviews</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryLeft}>
            <Text style={styles.avg}>{average.toFixed(1)}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <StarIcon key={n} size={12} />
              ))}
            </View>
            <Text style={styles.count}>{ratingCount} ratings</Text>
          </View>
          <View style={styles.breakdown}>
            {breakdown.map((b) => (
              <View key={b.star} style={styles.breakdownRow}>
                <Text style={styles.breakdownStar}>{b.star}</Text>
                <View style={styles.breakdownTrack}>
                  <View style={[styles.breakdownFill, { width: `${b.pct}%` }]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        <Pressable onPress={openWriteReview} style={styles.writeButton}>
          <Text style={styles.writeButtonText}>Write a review</Text>
        </Pressable>

        <Text style={styles.allReviewsTitle}>All reviews</Text>
        <View style={styles.reviewList}>
          {reviews.map((r) => (
            <View key={r.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{r.customer_initials}</Text>
                </View>
                <View style={styles.reviewMeta}>
                  <Text style={styles.reviewerName}>{r.customer_name}</Text>
                  <Text style={styles.reviewDate}>{timeAgo(r.created_at)}</Text>
                </View>
                <View style={styles.starsChip}>
                  <StarIcon size={10} />
                  <Text style={styles.starsChipText}>{r.rating}</Text>
                </View>
              </View>
              {r.comment && <Text style={styles.reviewText}>{r.comment}</Text>}
            </View>
          ))}
        </View>
      </ScrollView>

      {writeReviewOpen && (
        <>
          <Pressable style={styles.overlay} onPress={closeWriteReview} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
            <View style={styles.grabberRow}>
              <View style={styles.grabber} />
            </View>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderText}>
                <Text style={styles.sheetTitle}>Write a review</Text>
                <Text style={styles.sheetSubtitle}>Share your experience</Text>
              </View>
              <Pressable onPress={closeWriteReview} style={styles.sheetClose} hitSlop={0}>
                <View style={styles.sheetCloseInner}>
                  <CloseIcon size={14} color={ds.ink} strokeWidth={2.2} />
                </View>
              </Pressable>
            </View>
            <ScrollView style={styles.sheetBody} contentContainerStyle={styles.sheetBodyContent}>
              <Text style={styles.sheetLabel}>Your rating</Text>
              <View style={styles.starPicker}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable key={n} onPress={() => setMyRating(n)} hitSlop={4}>
                    <StarIcon size={30} fill={myRating >= n ? ds.star : ds.surface} stroke={ds.accent} />
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.sheetLabel, { marginTop: 16 }]}>Your review</Text>
              <TextInput
                value={reviewDraft}
                onChangeText={setReviewDraft}
                placeholder="Share your experience with this product…"
                placeholderTextColor={ds.ink2}
                multiline
                style={styles.textarea}
              />
            </ScrollView>
            <View style={styles.sheetFooter}>
              <Pressable onPress={submitReview} disabled={submitting} style={[styles.submitButton, submitting && styles.submitButtonDisabled]}>
                {submitting ? <ActivityIndicator color={ds.surface} /> : <Text style={styles.submitButtonText}>Submit review</Text>}
              </Pressable>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ds.canvas },
  headerRow: { flexShrink: 0, backgroundColor: ds.surface, borderBottomWidth: 1, borderBottomColor: ds.line, paddingHorizontal: dsSpacing.lg, paddingBottom: dsSpacing.lg, flexDirection: 'row', alignItems: 'center', gap: dsSpacing.md },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -6 },
  backButtonInner: { width: 32, height: 32, borderRadius: dsRadii.button, backgroundColor: ds.canvas, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, minWidth: 0, ...dsType.h2 },

  scrollContent: { padding: dsSpacing.lg, paddingTop: dsSpacing.lg, paddingBottom: dsSpacing.xl },
  summaryCard: { backgroundColor: ds.surface, borderWidth: 1, borderColor: ds.line, borderRadius: dsRadii.button, padding: dsSpacing.md, flexDirection: 'row', gap: dsSpacing.md, alignItems: 'center', ...dsElevation.e1 },
  summaryLeft: { flexShrink: 0, alignItems: 'center' },
  avg: { ...dsType.h1 },
  starsRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  count: { ...dsType.meta, marginTop: 4 },
  breakdown: { flex: 1, gap: 4 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: dsSpacing.sm },
  breakdownStar: { width: 10, ...dsType.meta },
  breakdownTrack: { flex: 1, height: 6, borderRadius: 6, backgroundColor: ds.canvas, overflow: 'hidden' },
  breakdownFill: { height: '100%', backgroundColor: ds.primary },

  writeButton: { marginTop: dsSpacing.md, height: 48, borderRadius: dsRadii.button, borderWidth: 1.5, borderColor: ds.primary, alignItems: 'center', justifyContent: 'center' },
  writeButtonText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.primaryInk },
  allReviewsTitle: { ...dsType.h3, marginTop: dsSpacing.xl },
  reviewList: { gap: dsSpacing.sm, marginTop: dsSpacing.md },
  reviewCard: { backgroundColor: ds.surface, borderWidth: 1, borderColor: ds.line, borderRadius: dsRadii.button, padding: dsSpacing.md, ...dsElevation.e1 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: dsSpacing.sm },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: ds.primarySoft, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontFamily: dsFontFamily[600], fontSize: 13, lineHeight: 18, color: ds.primaryInk },
  reviewMeta: { flex: 1, minWidth: 0 },
  reviewerName: { fontFamily: dsFontFamily[600], fontSize: 13, lineHeight: 18, color: ds.ink },
  reviewDate: { ...dsType.meta },
  starsChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ds.canvas, borderRadius: dsRadii.input, paddingHorizontal: dsSpacing.sm, paddingVertical: 4 },
  starsChipText: { fontFamily: dsFontFamily[600], fontSize: 11, lineHeight: 14, color: ds.ink },
  reviewText: { ...dsType.meta, marginTop: dsSpacing.sm },

  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(12,71,51,.45)', zIndex: 40 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '84%',
    backgroundColor: ds.surface,
    borderTopLeftRadius: dsRadii.sheet,
    borderTopRightRadius: dsRadii.sheet,
    overflow: 'hidden',
    zIndex: 50,
    ...dsElevation.e3,
  },
  grabberRow: { flexShrink: 0, alignItems: 'center', paddingTop: dsSpacing.sm },
  grabber: { width: 36, height: 4, borderRadius: dsRadii.pill, backgroundColor: ds.lineStrong },
  sheetHeader: { flexShrink: 0, backgroundColor: ds.surface, paddingHorizontal: dsSpacing.lg, paddingTop: dsSpacing.sm, paddingBottom: dsSpacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: dsSpacing.md, borderBottomWidth: 1, borderBottomColor: ds.line },
  sheetHeaderText: { minWidth: 0 },
  sheetTitle: { ...dsType.h2 },
  sheetSubtitle: { ...dsType.meta, marginTop: 4 },
  sheetClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -6 },
  sheetCloseInner: { width: 32, height: 32, borderRadius: dsRadii.button, backgroundColor: ds.canvas, alignItems: 'center', justifyContent: 'center' },
  sheetBody: { flexGrow: 0 },
  sheetBodyContent: { padding: dsSpacing.lg },
  sheetLabel: { fontFamily: dsFontFamily[600], fontSize: 13, lineHeight: 18, color: ds.ink2 },
  starPicker: { flexDirection: 'row', gap: dsSpacing.sm, marginTop: dsSpacing.sm },
  textarea: {
    minHeight: 88,
    marginTop: dsSpacing.sm,
    borderWidth: 1,
    borderColor: ds.lineStrong,
    borderRadius: dsRadii.input,
    padding: dsSpacing.md,
    ...dsType.body,
    textAlignVertical: 'top',
  },
  sheetFooter: { flexShrink: 0, borderTopWidth: 1, borderTopColor: ds.line, padding: dsSpacing.md, paddingHorizontal: dsSpacing.lg },
  submitButton: { height: 48, borderRadius: dsRadii.button, backgroundColor: ds.primaryStrong, alignItems: 'center', justifyContent: 'center' },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.surface },
});
