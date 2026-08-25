// Shared by the auth screens (phone.tsx/otp.tsx/register.tsx) - the exact same phone string must
// be used across send-otp/verify/customer-creation (the backend's auth identity is keyed by this
// literal string, see entity_id in auth-phone-otp's send route), so this single formatter is the
// one source of truth rather than each screen prefixing "+91" itself.
export function toE164(localDigits: string): string {
  return `+91${localDigits}`;
}
