import { StubScreen } from '@/components/shell/StubScreen';

// `placeOrder` (Checkout screen) still jumps straight here, decorative/no real payment — matches the
// source exactly. The tracking screen itself is out of this round's scope (Product/Cart/Checkout/mini
// cart only), so it stays a stub for now, same pattern as other not-yet-built screens.
export default function TrackingScreen() {
  return <StubScreen title="Order tracking" detail="Order placed — tracking coming soon" />;
}
