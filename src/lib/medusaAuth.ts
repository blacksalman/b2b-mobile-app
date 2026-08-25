import { storeFetch, storeMutate } from './medusaClient';
import { setToken, clearToken, getCachedToken, hydrateToken } from './authToken';

export { hydrateToken };

export interface MedusaCustomer {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  company_name: string | null;
  metadata: Record<string, unknown> | null;
}

// Minimal, purpose-built base64url decode - just enough to read `actor_id` out of a JWT payload
// without pulling in a JWT library or relying on `atob` (not guaranteed present in the Hermes/RN
// runtime). Never used to trust the token's contents for anything security-sensitive - the
// backend re-verifies the signature on every real request; this only decides which screen to
// show next (already-a-customer vs needs-registration).
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  let output = '';
  let buffer = 0;
  let bits = 0;
  for (const char of normalized) {
    const value = BASE64_CHARS.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return output;
}

function decodeJwtActorId(token: string): string {
  try {
    const payloadB64 = token.split('.')[1];
    const payload = JSON.parse(base64UrlDecode(payloadB64));
    return payload.actor_id ?? '';
  } catch {
    return '';
  }
}

// POST /auth/customer/phone-otp/send (custom - src/api/auth/customer/phone-otp/send/route.ts).
// Real Kaleyra SMS + Emovur WhatsApp delivery, live-verified this session.
export async function sendOtp(phone: string): Promise<void> {
  await storeMutate('/auth/customer/phone-otp/send', 'POST', { phone });
}

export interface VerifyOtpResult {
  isNewUser: boolean;
}

// POST /auth/customer/phone_otp/register (native dynamic auth route). Live-verified this
// session: this same endpoint works for BOTH a brand-new phone and a returning one - the
// PhoneOtpAuthService's register() and authenticate() are identical OTP checks, and the actor_id
// baked into the returned token reflects whatever this auth identity's app_metadata.customer_id
// happens to be *right now* (empty for a phone that's never completed signup, populated for a
// returning customer) - there's no separate "not registered" failure to branch on. So this one
// call covers login and the first half of registration; the caller decides what's next purely
// from whether the token already has an actor attached.
export async function verifyOtp(phone: string, otp: string): Promise<VerifyOtpResult> {
  const data = await storeMutate<{ token: string }>('/auth/customer/phone_otp/register', 'POST', { phone, otp });
  await setToken(data.token);
  return { isNewUser: !decodeJwtActorId(data.token) };
}

export interface RegisterProfileInput {
  email: string;
  firstName: string;
  lastName?: string;
  phone: string;
  companyName?: string;
  businessType?: string;
}

// Only called when verifyOtp returned isNewUser:true. Creates the real customer record with the
// interim registration token (still cached from verifyOtp, picked up automatically by
// storeMutate's Authorization header), then exchanges it for a real working session via the
// custom finalize-session route - see the backend's
// src/api/auth/customer/phone-otp/session/route.ts for exactly why that second call is needed
// (the registration token's actor_id is permanently baked in as empty from the moment it was
// signed, before this customer record existed) and why it does NOT require asking the user to
// re-enter their OTP a second time in the same signup - live end-to-end verified this session.
export async function completeRegistration(input: RegisterProfileInput): Promise<MedusaCustomer> {
  const created = await storeMutate<{ customer: MedusaCustomer }>('/store/customers', 'POST', {
    email: input.email,
    first_name: input.firstName,
    last_name: input.lastName,
    phone: input.phone,
    company_name: input.companyName || undefined,
    metadata: input.businessType ? { business_type: input.businessType } : undefined,
  });
  const session = await storeMutate<{ token: string }>('/auth/customer/phone-otp/session', 'POST');
  await setToken(session.token);
  return created.customer;
}

// GET /store/customers/me - native, scoped to whatever token is currently cached. Returns null
// (and clears a bad token) both when logged out and when the cached token turns out to be
// invalid/expired, so callers never need to distinguish those two cases themselves.
export async function fetchCurrentCustomer(): Promise<MedusaCustomer | null> {
  if (!getCachedToken()) return null;
  try {
    const data = await storeFetch<{ customer: MedusaCustomer }>('/store/customers/me');
    return data.customer;
  } catch {
    await clearToken();
    return null;
  }
}

export async function logout(): Promise<void> {
  await clearToken();
}
