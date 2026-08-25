// Loads Razorpay's own hosted Checkout.js (their CDN, not bundled) inside a WebView
// (components/composite/RazorpayCheckoutModal.tsx) - the standard integration path for an Expo
// MANAGED-workflow app (no android/ios native folders here - confirmed - so the native
// react-native-razorpay SDK isn't viable without ejecting to a custom dev client, a real
// disruption to the existing `npx expo start`/Expo Go workflow this app is tested with). Every
// dynamic value is passed through JSON.stringify before being embedded in the generated script,
// not naive string interpolation, so a name/email containing a quote can't break the page.
export interface RazorpayCheckoutParams {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefillName?: string;
  prefillEmail?: string;
  // Razorpay's `contact` prefill wants a plain 10-digit local number, not the "+91"-prefixed
  // form this app stores customer.phone in elsewhere (edit-profile.tsx/addresses.tsx already
  // strip that same prefix for their own local-digit inputs) - callers pass the stripped form.
  prefillContact?: string;
  themeColor: string;
}

export type RazorpayCheckoutMessage =
  | { status: 'success'; razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }
  | { status: 'dismissed' }
  | { status: 'failed'; error: string };

export function buildRazorpayCheckoutHtml(params: RazorpayCheckoutParams): string {
  const options = {
    key: params.keyId,
    amount: params.amount,
    currency: params.currency,
    order_id: params.orderId,
    name: params.name,
    description: params.description,
    prefill: {
      name: params.prefillName ?? '',
      email: params.prefillEmail ?? '',
      contact: params.prefillContact ?? '',
    },
    theme: { color: params.themeColor },
  };

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>html, body { margin: 0; padding: 0; height: 100%; background: #F6F8F7; }</style>
</head>
<body>
<script>
  function post(msg) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
  }
  var options = ${JSON.stringify(options)};
  options.handler = function (response) {
    post({
      status: 'success',
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_order_id: response.razorpay_order_id,
      razorpay_signature: response.razorpay_signature,
    });
  };
  options.modal = {
    ondismiss: function () {
      post({ status: 'dismissed' });
    },
  };
  try {
    var rzp = new Razorpay(options);
    rzp.on('payment.failed', function (response) {
      post({ status: 'failed', error: (response.error && response.error.description) || 'Payment failed' });
    });
    rzp.open();
  } catch (e) {
    post({ status: 'failed', error: String(e && e.message ? e.message : e) });
  }
</script>
</body>
</html>`;
}
