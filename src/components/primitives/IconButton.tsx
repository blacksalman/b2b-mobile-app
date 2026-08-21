import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '@/theme';

interface IconButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  size?: number;
  radius?: number;
  background?: string;
  border?: string;
  style?: ViewStyle;
}

export function IconButton({
  children,
  onPress,
  size = 38,
  radius,
  background = colors.cardBg,
  border,
  style,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: radius ?? size / 2,
          backgroundColor: background,
          borderWidth: border ? 1.4 : 0,
          borderColor: border,
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
