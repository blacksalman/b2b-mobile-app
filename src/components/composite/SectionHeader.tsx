import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily } from '@/theme';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  align?: 'start' | 'end';
}

export function SectionHeader({ title, subtitle, actionLabel, onAction, align = 'start' }: SectionHeaderProps) {
  return (
    <View style={[styles.row, { alignItems: align === 'start' ? 'flex-start' : 'flex-end' }]}>
      <View style={styles.textCol}>
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
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 14,
  },
  textCol: { flexShrink: 1 },
  title: {
    fontFamily: fontFamily[700],
    fontSize: 19,
    color: colors.charcoal,
  },
  subtitle: {
    fontFamily: fontFamily[400],
    fontSize: 11.5,
    color: colors.bodyGray,
    marginTop: 2,
  },
  action: {
    fontFamily: fontFamily[600],
    fontSize: 11.5,
    color: colors.brandGreen,
    borderBottomWidth: 1.4,
    borderBottomColor: colors.brandGreen,
    paddingBottom: 1,
  },
});
