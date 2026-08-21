import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamily } from '@/theme';
import { CloseIcon, SmallBackChevronIcon, StarIcon } from '@/icons';
import { reviewList, reviewsSummary } from '@/data/product-detail-content';
import { useAppState } from '@/state/AppStateContext';

// Ported verbatim from the source's `isReviews` (line 1164). Reachable only from the Product page's
// rating pill. `goBack` here replicates a genuine source quirk: the shared `goBack` handler special-
// cases `prev==='product'` to navigate Home instead of back to the Product page it was opened from
// (`goBack:()=>this.go(s.prev==='product'?'home':s.prev)`, and `goReviews` always sets
// `prev:'product'`) — so tapping back on Reviews always lands on Home, never back on Product. Not a
// bug; replicated exactly rather than using a normal router.back().
export default function ReviewsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { flash } = useAppState();

  const [writeReviewOpen, setWriteReviewOpen] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [reviewDraft, setReviewDraft] = useState('');

  const goBack = () => router.push('/');
  const openWriteReview = () => {
    setMyRating(0);
    setReviewDraft('');
    setWriteReviewOpen(true);
  };
  const closeWriteReview = () => setWriteReviewOpen(false);
  const submitReview = () => {
    setWriteReviewOpen(false);
    flash('Thanks — your review was submitted');
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={goBack} style={styles.backButton}>
            <SmallBackChevronIcon size={9} />
          </Pressable>
          <Text style={styles.headerTitle}>Ratings &amp; Reviews</Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryLeft}>
            <Text style={styles.avg}>{reviewsSummary.avg}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <StarIcon key={n} size={12} />
              ))}
            </View>
            <Text style={styles.count}>{reviewsSummary.count} ratings</Text>
          </View>
          <View style={styles.breakdown}>
            {reviewsSummary.breakdown.map((b) => (
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
          {reviewList.map((r) => (
            <View key={r.name} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{r.initials}</Text>
                </View>
                <View style={styles.reviewMeta}>
                  <Text style={styles.reviewerName}>{r.name}</Text>
                  <Text style={styles.reviewDate}>{r.date}</Text>
                </View>
                <View style={styles.starsChip}>
                  <StarIcon size={10} />
                  <Text style={styles.starsChipText}>{r.stars}</Text>
                </View>
              </View>
              <Text style={styles.reviewText}>{r.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {writeReviewOpen && (
        <>
          <Pressable style={styles.overlay} onPress={closeWriteReview} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Write a review</Text>
              <Pressable onPress={closeWriteReview} style={styles.sheetClose} hitSlop={8}>
                <CloseIcon size={12} color={colors.charcoal} strokeWidth={2.2} />
              </Pressable>
            </View>
            <ScrollView style={styles.sheetBody} contentContainerStyle={styles.sheetBodyContent}>
              <Text style={styles.sheetLabel}>Your rating</Text>
              <View style={styles.starPicker}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable key={n} onPress={() => setMyRating(n)} hitSlop={4}>
                    <StarIcon size={30} fill={myRating >= n ? '#F5B942' : '#fff'} stroke="#F5B942" />
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.sheetLabel, { marginTop: 18 }]}>Your review</Text>
              <TextInput
                value={reviewDraft}
                onChangeText={setReviewDraft}
                placeholder="Share your experience with this product…"
                placeholderTextColor={colors.bodyGray}
                multiline
                style={styles.textarea}
              />
            </ScrollView>
            <View style={styles.sheetFooter}>
              <Pressable onPress={submitReview} style={styles.submitButton}>
                <Text style={styles.submitButtonText}>Submit review</Text>
              </Pressable>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cardBg },
  scrollContent: { paddingHorizontal: 14, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fontFamily[700], fontSize: 20, color: colors.charcoal },
  summaryCard: {
    marginTop: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    gap: 18,
    alignItems: 'center',
  },
  summaryLeft: { flexShrink: 0, alignItems: 'center' },
  avg: { fontFamily: fontFamily[700], fontSize: 34, color: colors.charcoal, letterSpacing: -0.2 },
  starsRow: { flexDirection: 'row', gap: 2, marginTop: 4 },
  count: { fontFamily: fontFamily[400], fontSize: 10.5, color: colors.bodyGray, marginTop: 4 },
  breakdown: { flex: 1, gap: 5 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  breakdownStar: { width: 10, fontFamily: fontFamily[400], fontSize: 10, color: colors.bodyGray },
  breakdownTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.cardBg, overflow: 'hidden' },
  breakdownFill: { height: '100%', backgroundColor: colors.brandGreen },
  writeButton: { marginTop: 12, height: 46, borderRadius: 12, borderWidth: 1.6, borderColor: colors.brandGreen, alignItems: 'center', justifyContent: 'center' },
  writeButtonText: { fontFamily: fontFamily[600], fontSize: 13, color: colors.brandGreen },
  allReviewsTitle: { fontFamily: fontFamily[700], fontSize: 15, color: colors.charcoal, marginTop: 20 },
  reviewList: { gap: 10, marginTop: 10 },
  reviewCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderGray, borderRadius: 16, padding: 14 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.mintTint, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontFamily: fontFamily[600], fontSize: 12, color: colors.forestGreen },
  reviewMeta: { flex: 1, minWidth: 0 },
  reviewerName: { fontFamily: fontFamily[600], fontSize: 12.5, color: colors.charcoal },
  reviewDate: { fontFamily: fontFamily[400], fontSize: 10, color: colors.bodyGray, marginTop: 1 },
  starsChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.cardBg, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4 },
  starsChipText: { fontFamily: fontFamily[600], fontSize: 10.5, color: colors.charcoal },
  reviewText: { fontFamily: fontFamily[400], fontSize: 12, lineHeight: 18.6, color: colors.bodyGray, marginTop: 9 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,.4)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '80%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexShrink: 0,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: { fontFamily: fontFamily[700], fontSize: 18, color: colors.charcoal },
  sheetClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.cardBg, alignItems: 'center', justifyContent: 'center' },
  sheetBody: { flexGrow: 0 },
  sheetBodyContent: { padding: 16 },
  sheetLabel: { fontFamily: fontFamily[600], fontSize: 14, color: colors.charcoal },
  starPicker: { flexDirection: 'row', gap: 8, marginTop: 9 },
  textarea: {
    height: 110,
    marginTop: 9,
    borderWidth: 1.4,
    borderColor: colors.borderGray,
    borderRadius: 14,
    padding: 12,
    fontFamily: fontFamily[400],
    fontSize: 13,
    color: colors.charcoal,
    textAlignVertical: 'top',
  },
  sheetFooter: { flexShrink: 0, borderTopWidth: 1, borderTopColor: colors.borderGray, padding: 14, paddingHorizontal: 16 },
  submitButton: { height: 48, borderRadius: 12, backgroundColor: colors.brandGreen, alignItems: 'center', justifyContent: 'center' },
  submitButtonText: { fontFamily: fontFamily[600], fontSize: 14, color: colors.white },
});
