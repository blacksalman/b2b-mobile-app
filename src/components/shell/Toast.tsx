import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fontFamily } from '@/theme';
import { useAppState } from '@/state/AppStateContext';

interface ToastProps {
  bottomOffset: number;
}

// Ported verbatim from the source's toast (line 1337): dark forest-green pill floating above the tab
// bar, message + "View order" link in gold, slide-up-and-fade-in on appear. Auto-dismiss timing lives
// in AppStateContext's flash() (2.6s), matching the source's setTimeout.
export function Toast({ bottomOffset }: ToastProps) {
  const { toast } = useAppState();
  const router = useRouter();
  const translateY = useRef(new Animated.Value(14)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (toast) {
      translateY.setValue(14);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [toast, translateY, opacity]);

  if (!toast) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { bottom: bottomOffset, transform: [{ translateY }], opacity },
      ]}
    >
      <Text style={styles.message}>{toast}</Text>
      <Pressable onPress={() => router.push('/cart')} hitSlop={8}>
        <Text style={styles.link}>View order</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: colors.forestGreen,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  message: {
    fontFamily: fontFamily[500],
    fontSize: 12,
    color: colors.white,
    flexShrink: 1,
  },
  link: {
    fontFamily: fontFamily[600],
    fontSize: 12,
    color: colors.gold,
  },
});
