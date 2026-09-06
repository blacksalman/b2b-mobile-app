// Where the 3-screen auth flow (phone -> otp -> register) should land once login completes.
//
// The flow used to always finish at /account, which is right when you tapped "Log in" from Account
// but wrong when something else sent you there: gating Checkout behind login and then dropping the
// customer on Account meant they had to find their way back to the cart and start again.
//
// The destination travels as a `next` route param so each screen can pass it along without any
// shared state. It is NOT used as a path directly - route params are attacker-reachable via deep
// links, and pushing whatever string arrives would let an external link drop someone on any screen
// in the app immediately after they authenticate. Only the destinations listed here are honoured;
// anything else (including absent, empty or unrecognised) falls back to /account, which is the
// historical behaviour.
const ALLOWED = ['/checkout'] as const;

export type AfterLoginTarget = (typeof ALLOWED)[number] | '/account';

export function afterLoginTarget(next: string | undefined): AfterLoginTarget {
  return (ALLOWED as readonly string[]).includes(next ?? '') ? (next as AfterLoginTarget) : '/account';
}
