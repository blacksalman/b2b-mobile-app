import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamily } from '@/theme';
import { BackChevronIcon } from '@/icons';

interface StubScreenProps {
  title: string;
  detail?: string;
  showBack?: boolean;
}

// Placeholder for a screen not yet built in this milestone (Product detail, Brand, Category detail,
// Cart, Account). Deliberately plain — not an attempt at the real screen — so navigation from
// Home/Categories/Search never dead-ends while those screens are pending in a later milestone.
export function StubScreen({ title, detail, showBack = true }: StubScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      {showBack && (
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <BackChevronIcon size={20} />
        </Pressable>
      )}
      <View style={styles.center}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>Coming soon</Text>
        {!!detail && <Text style={styles.detail}>{detail}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cardBg, paddingHorizontal: 14 },
  backButton: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  title: { fontFamily: fontFamily[700], fontSize: 20, color: colors.charcoal },
  subtitle: { fontFamily: fontFamily[400], fontSize: 13, color: colors.bodyGray },
  detail: { fontFamily: fontFamily[500], fontSize: 12, color: colors.brandGreen, marginTop: 8 },
});
