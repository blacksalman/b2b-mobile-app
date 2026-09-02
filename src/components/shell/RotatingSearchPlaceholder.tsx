import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { dsFontFamily } from '@/theme';
import { SEARCH_SUGGESTIONS } from '@/data/searchSuggestions';

const ROTATE_MS = 3400;
const FADE_MS = 420;
// One line box tall, so a term leaving upward is clipped rather than drawn over the row above.
const LINE_HEIGHT = 21;
const SLIDE = LINE_HEIGHT;

interface RotatingSearchPlaceholderProps {
  color: string;
  /** Stop rotating - callers pass their own "field has text" flag. */
  paused?: boolean;
  /** Absolutely fill the parent, for overlaying a real TextInput. */
  overlay?: boolean;
}

/**
 * "Search for <term>", with the term sliding up and out as the next one slides up into its place.
 *
 * This exists as drawn text rather than a TextInput `placeholder` because that prop takes a plain
 * string - there's no way to animate it, and swapping it just hard-cuts between terms. So the two
 * real search fields render this over an empty-placeholder input instead, and hide it once the
 * field has text.
 */
export function RotatingSearchPlaceholder({ color, paused = false, overlay = false }: RotatingSearchPlaceholderProps) {
  const [i, setI] = useState(0);
  // -1 = gone up and out, 0 = resting, 1 = waiting below to come up.
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      Animated.timing(slide, { toValue: -1, duration: FADE_MS, useNativeDriver: true }).start(({ finished }) => {
        // A cleanup mid-animation leaves `finished` false; swapping the term then would restart the
        // cycle on an unmounted or paused field.
        if (!finished) return;
        setI((n) => (n + 1) % SEARCH_SUGGESTIONS.length);
        slide.setValue(1);
        Animated.timing(slide, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start();
      });
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [paused, slide]);

  const style = {
    opacity: slide.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] }),
    transform: [{ translateY: slide.interpolate({ inputRange: [-1, 0, 1], outputRange: [-SLIDE, 0, SLIDE] }) }],
  };

  return (
    <View style={[styles.row, overlay && styles.overlay]} pointerEvents="none">
      <Text style={[styles.text, { color }]}>Search for </Text>
      <View style={styles.clip}>
        <Animated.Text style={[styles.text, { color }, style]} numberOfLines={1}>
          {SEARCH_SUGGESTIONS[i]}
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  clip: { flex: 1, height: LINE_HEIGHT, overflow: 'hidden', justifyContent: 'center' },
  text: { fontFamily: dsFontFamily[400], fontSize: 14, lineHeight: LINE_HEIGHT },
});
