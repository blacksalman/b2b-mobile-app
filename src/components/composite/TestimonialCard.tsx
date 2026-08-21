import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily } from '@/theme';
import { QuoteIcon } from '@/icons';

interface DoctorTestimonialProps {
  kind: 'doctor';
  quote: string;
  name: string;
  title: string;
  initials: string;
}

interface BuyerTestimonialProps {
  kind: 'buyer';
  quote: string;
  name: string;
  tag: string;
  initials: string;
}

type TestimonialCardProps = DoctorTestimonialProps | BuyerTestimonialProps;

// Ported verbatim from "Doctor's Talk" (line 470, quote-mark icon) and "What buyers say" (line 490,
// 5-star row) — two near-identical card shapes sharing the same underlying pattern.
export const TestimonialCard = React.memo(function TestimonialCard(props: TestimonialCardProps) {
  if (props.kind === 'doctor') {
    return (
      <View style={styles.doctorCard}>
        <QuoteIcon width={20} />
        <Text style={styles.quote}>{props.quote}</Text>
        <View style={styles.footerRow}>
          <View style={[styles.avatar, { backgroundColor: colors.mintTint }]}>
            <Text style={[styles.avatarText, { color: colors.forestGreen }]}>{props.initials}</Text>
          </View>
          <View style={styles.footerText}>
            <Text style={styles.name}>{props.name}</Text>
            <Text style={styles.subtext}>{props.title}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.buyerCard}>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Text key={n} style={styles.star}>★</Text>
        ))}
      </View>
      <Text style={styles.quote}>{props.quote}</Text>
      <View style={styles.footerRow}>
        <View style={[styles.avatar, { width: 36, height: 36, backgroundColor: colors.cardBg }]}>
          <Text style={[styles.avatarText, { fontSize: 12, color: colors.charcoal }]}>{props.initials}</Text>
        </View>
        <View style={styles.footerText}>
          <Text style={[styles.name, { fontSize: 11.5 }]}>{props.name}</Text>
          <Text style={styles.subtext}>{props.tag}</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  doctorCard: {
    width: 270,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 16,
    padding: 16,
  },
  buyerCard: {
    width: 250,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  starsRow: { flexDirection: 'row', gap: 2 },
  star: { color: colors.starYellow, fontSize: 14 },
  quote: {
    fontFamily: fontFamily[400],
    fontSize: 12.5,
    lineHeight: 19.4,
    color: colors.charcoal,
    marginTop: 9,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 13,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fontFamily[600], fontSize: 13 },
  footerText: { minWidth: 0 },
  name: { fontFamily: fontFamily[600], fontSize: 12, color: colors.charcoal },
  subtext: { fontFamily: fontFamily[400], fontSize: 10.5, color: colors.bodyGray, marginTop: 1 },
});
