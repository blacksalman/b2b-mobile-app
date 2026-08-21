import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamily } from '@/theme';
import { CloseIcon } from '@/icons';
import { CartLineCard } from '@/components/composite/CartLineCard';
import { useAppState } from '@/state/AppStateContext';

interface MiniCartSheetProps {
  visible: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

// Ported verbatim from `miniCartOpen` (source line 1769) — a near-duplicate of the Cart page's line
// list inside a bottom sheet, but with just a grand-total footer (no Subtotal/Tax/Shipping breakdown,
// unlike the full Cart/Checkout pages).
export function MiniCartSheet({ visible, onClose, onCheckout }: MiniCartSheetProps) {
  const insets = useSafeAreaInsets();
  const { inc, dec, removeFromCart, cartTotals } = useAppState();
  const { cartLines, total, mrpTotal, cartHasDiscount, savePercent } = cartTotals;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>Cart Preview</Text>
          <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
            <CloseIcon size={12} color={colors.charcoal} strokeWidth={2.2} />
          </Pressable>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          {cartLines.map((line) => (
            <CartLineCard key={line.id} line={line} onInc={() => inc(line.id)} onDec={() => dec(line.id)} onRemove={() => removeFromCart(line.id)} />
          ))}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: 14 + insets.bottom }]}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <View style={styles.totalRight}>
              {cartHasDiscount && <Text style={styles.mrpStrike}>{mrpTotal}</Text>}
              <Text style={styles.totalValue}>{total}</Text>
              {cartHasDiscount && (
                <View style={styles.savePill}>
                  <Text style={styles.savePillText}>{savePercent} off</Text>
                </View>
              )}
            </View>
          </View>
          <Pressable onPress={onCheckout} style={styles.checkoutButton}>
            <Text style={styles.checkoutButtonText}>Checkout</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.4)' },
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
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontFamily: fontFamily[700], fontSize: 18, color: colors.charcoal },
  closeButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.cardBg, alignItems: 'center', justifyContent: 'center' },
  body: { flexGrow: 0 },
  bodyContent: { padding: 14, gap: 10 },
  footer: { borderTopWidth: 1, borderTopColor: colors.borderGray, padding: 14, paddingTop: 14, gap: 12 },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { fontFamily: fontFamily[700], fontSize: 15, color: colors.charcoal },
  totalRight: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  mrpStrike: { fontFamily: fontFamily[400], fontSize: 12, color: '#9A9A98', textDecorationLine: 'line-through' },
  totalValue: { fontFamily: fontFamily[700], fontSize: 18, color: colors.brandGreen },
  savePill: { backgroundColor: colors.mintTint, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  savePillText: { fontFamily: fontFamily[600], fontSize: 10.5, color: colors.brandGreen },
  checkoutButton: { height: 48, borderRadius: 12, backgroundColor: colors.brandGreen, alignItems: 'center', justifyContent: 'center' },
  checkoutButtonText: { fontFamily: fontFamily[600], fontSize: 14, color: colors.white },
});
