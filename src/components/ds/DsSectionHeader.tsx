import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ds, dsFontFamily, dsSpacing } from '@/theme';

interface DsSectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

// Rebuilt against the new AyurvedaOne design system's section-header pattern (repeated verbatim
// throughout Various Mobile App - Phone.dc.html, e.g. line 29-33, 111-114, 165-168): `h3` title +
// optional `meta` subline, with an optional trailing "View all" ghost link baseline-aligned to the
// title (DESIGN-SYSTEM.md §8.5). Distinct from the old `SectionHeader.tsx` (untouched, still used by
// screens not yet migrated).
export const DsSectionHeader = React.memo(function DsSectionHeader({ title, subtitle, actionLabel, onAction }: DsSectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {!!actionLabel && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: dsSpacing.lg,
    paddingTop: dsSpacing.xl,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: dsSpacing.md,
  },
  textBlock: { flex: 1, minWidth: 0 },
  title: { fontFamily: dsFontFamily[600], fontSize: 16, lineHeight: 22, letterSpacing: -0.16, color: ds.ink },
  subtitle: { fontFamily: dsFontFamily[400], fontSize: 12, lineHeight: 16, color: ds.ink2, marginTop: 4 },
  action: { fontFamily: dsFontFamily[600], fontSize: 14, lineHeight: 20, color: ds.primaryInk },
});
