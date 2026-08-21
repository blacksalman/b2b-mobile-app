import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily } from '@/theme';
import { ArrowRightIcon, CheckThinIcon } from '@/icons';

interface BrandCardProps {
  name: string;
  short: string;
  initials: string;
  line: string;
  rating: string;
  reviews: string;
  blurb: string;
  usps: string[];
  metaLine: string;
  skus: number;
  tint: string;
  onShop: () => void;
}

// Ported verbatim from the Home "Brands to know" card (line 196).
export const BrandCard = React.memo(function BrandCard({ name, short, initials, line, rating, reviews, blurb, usps, metaLine, skus, tint, onShop }: BrandCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.photoBand, { backgroundColor: tint }]}>
        <Text style={styles.photoLabel}>store photo</Text>
        <View style={styles.directTrade}>
          <Text style={styles.directTradeText}>DIRECT TRADE</Text>
        </View>
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.avatarCol}>
            <View style={[styles.avatar, { backgroundColor: tint }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.ratingRow}>
              <Text style={styles.star}>★</Text>
              <Text style={styles.ratingText}>{rating}</Text>
              <Text style={styles.reviewsText}> ({reviews})</Text>
            </View>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.line}>{line}</Text>
            <Text style={styles.blurb}>{blurb}</Text>
          </View>
        </View>

        <View style={styles.uspGrid}>
          {usps.map((u) => (
            <View key={u} style={styles.uspItem}>
              <View style={styles.uspCheck}>
                <CheckThinIcon size={9} />
              </View>
              <Text style={styles.uspText}>{u}</Text>
            </View>
          ))}
        </View>

        <View style={styles.metaBanner}>
          <Text style={styles.metaText}>{metaLine}</Text>
        </View>

        <Pressable onPress={onShop} style={styles.shopButton}>
          <Text style={styles.shopText}>Shop {short} · {skus} SKUs</Text>
          <ArrowRightIcon size={16} />
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 16,
    overflow: 'hidden',
  },
  photoBand: {
    height: 104,
    justifyContent: 'flex-end',
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  photoLabel: {
    fontFamily: fontFamily[500],
    fontSize: 9,
    color: 'rgba(0,0,0,.32)',
  },
  directTrade: {
    position: 'absolute',
    top: 9,
    left: 11,
    backgroundColor: 'rgba(255,255,255,.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  directTradeText: {
    fontFamily: fontFamily[600],
    fontSize: 9.5,
    color: colors.forestGreen,
    letterSpacing: 0.6,
  },
  content: { padding: 14 },
  topRow: { flexDirection: 'row', gap: 13 },
  avatarCol: { width: 76 },
  avatar: {
    height: 76,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fontFamily[700],
    fontSize: 20,
    color: colors.charcoal,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginTop: 7,
  },
  star: { color: colors.starYellow, fontSize: 11 },
  ratingText: { fontFamily: fontFamily[600], fontSize: 10, color: colors.charcoal },
  reviewsText: { fontFamily: fontFamily[400], fontSize: 10, color: colors.bodyGray },
  infoCol: { flex: 1, minWidth: 0 },
  name: { fontFamily: fontFamily[700], fontSize: 15, color: colors.charcoal },
  line: {
    fontFamily: fontFamily[400],
    fontSize: 10,
    color: colors.bodyGray,
    marginTop: 2,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  blurb: {
    fontFamily: fontFamily[400],
    fontSize: 11,
    lineHeight: 16.5,
    color: colors.bodyGray,
    marginTop: 8,
  },
  uspGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 12,
  },
  uspItem: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.cardBg,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  uspCheck: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.mintTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uspText: { fontFamily: fontFamily[500], fontSize: 10, color: colors.charcoal, flexShrink: 1 },
  metaBanner: {
    backgroundColor: colors.mintTint,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 9,
  },
  metaText: { fontFamily: fontFamily[600], fontSize: 11, color: colors.forestGreen },
  shopButton: {
    marginTop: 11,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.brandGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  shopText: { fontFamily: fontFamily[600], fontSize: 12.5, color: colors.white },
});
