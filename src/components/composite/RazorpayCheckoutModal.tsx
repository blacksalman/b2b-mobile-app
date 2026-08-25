import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ds, dsFontFamily, dsRadii, dsSpacing } from '@/theme';
import { SmallBackChevronIcon } from '@/icons';
import { buildRazorpayCheckoutHtml, type RazorpayCheckoutParams, type RazorpayCheckoutMessage } from '@/lib/razorpayCheckout';

interface RazorpayCheckoutModalProps {
  visible: boolean;
  params: RazorpayCheckoutParams | null;
  onSuccess: (paymentId: string) => void;
  onDismiss: () => void;
  onError: (message: string) => void;
}

// Full-screen WebView hosting Razorpay's own Checkout.js (razorpayCheckout.ts) - the payment
// sheet itself is Razorpay's, not this app's design system, so there's no "screen_..." source to
// port here; only the wrapping chrome (header/close button) is this app's own. The header stays
// visible the whole time (not just an overlay close button) so a customer who changes their mind
// mid-payment always has an obvious way out, same reasoning as every other sheet/modal in this
// app keeping its own close affordance rather than relying solely on a back gesture.
export function RazorpayCheckoutModal({ visible, params, onSuccess, onDismiss, onError }: RazorpayCheckoutModalProps) {
  const insets = useSafeAreaInsets();
  const html = useMemo(() => (params ? buildRazorpayCheckoutHtml(params) : ''), [params]);

  const handleMessage = (event: WebViewMessageEvent) => {
    let message: RazorpayCheckoutMessage;
    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch {
      onError('Something went wrong with the payment sheet.');
      return;
    }
    if (message.status === 'success') onSuccess(message.razorpay_payment_id);
    else if (message.status === 'dismissed') onDismiss();
    else onError(message.error || 'Payment failed');
  };

  if (!params) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + dsSpacing.md }]}>
          <Pressable onPress={onDismiss} style={styles.backButton} hitSlop={4}>
            <SmallBackChevronIcon size={9} color={ds.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>Complete payment</Text>
        </View>
        <WebView
          source={{ html }}
          onMessage={handleMessage}
          style={styles.webview}
          // Razorpay's own checkout page needs real JS/DOM storage to run its own SDK -
          // both already default true in react-native-webview, set explicitly here since a
          // silently-misconfigured payment page is the wrong place to rely on a library default.
          javaScriptEnabled
          domStorageEnabled
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ds.canvas },
  header: {
    flexShrink: 0,
    backgroundColor: ds.surface,
    borderBottomWidth: 1,
    borderBottomColor: ds.line,
    paddingHorizontal: dsSpacing.lg,
    paddingBottom: dsSpacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: dsSpacing.md,
  },
  backButton: {
    flexShrink: 0,
    width: 32,
    height: 32,
    borderRadius: dsRadii.button,
    backgroundColor: ds.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontFamily: dsFontFamily[700], fontSize: 18, lineHeight: 24, letterSpacing: -0.18, color: ds.ink },
  webview: { flex: 1, backgroundColor: ds.canvas },
});
