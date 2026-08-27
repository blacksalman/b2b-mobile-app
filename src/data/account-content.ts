import { useEffect, useState } from 'react';
import { fetchPolicies, type MedusaPolicy } from '@/lib/medusaClient';

// Policy content (Terms & Conditions, Privacy Policy, Return/Refund/Cancellation,
// Shipping & Delivery, Disclaimer, About Us, Contact Us) now lives in the backend
// (Operations > Policies, GET /store/policies) instead of being hardcoded here - editable from
// admin with no app update needed. `key` is the stable slug both account.tsx and checkout.tsx
// wire specific popups to ('about'/'contact' render in their own "About" section on Account;
// 'returns'/'shipping' back Checkout's two policy rows).
export type PolicyEntry = MedusaPolicy;

const ABOUT_CONTACT_KEYS = ['about', 'contact'];

export interface PoliciesState {
  loading: boolean;
  policies: MedusaPolicy[];
}

export function usePolicies(): PoliciesState {
  const [policies, setPolicies] = useState<MedusaPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchPolicies()
      .then((d) => {
        if (!cancelled) setPolicies(d.policies);
      })
      .catch(() => {
        // Policies sections just stay empty - not worth surfacing.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, policies };
}

// The rows Account's "Policies" section renders - everything except about/contact, which render
// in their own "About" section instead (see AboutGroup in account.tsx). Already rank-ordered by
// the backend.
export function policyRows(policies: MedusaPolicy[]): MedusaPolicy[] {
  return policies.filter((p) => !ABOUT_CONTACT_KEYS.includes(p.key));
}

// Resolved: `s.addresses` (various-mobile-app-phone.dc.html lines 2540-2543) is in range, not
// truncated — read directly, not inferred. Two seeded addresses, both for the same contact ('Tom',
// matching the profile phone above), at different pharmacy/clinic locations.
export interface AddressEntry {
  id: number;
  name: string;
  phone: string;
  label: string;
  line: string;
  landmark: string;
  pincode: string;
  city: string;
  state: string;
}

export const ADDRESS_SEED: AddressEntry[] = [
  { id: 1, name: 'Tom', phone: '+91 9656950687', label: 'Sunrise Pharmacy', line: '12, MG Road, 2nd Cross', landmark: 'Near City Hospital', pincode: '560001', city: 'Bengaluru', state: 'Karnataka' },
  { id: 2, name: 'Tom', phone: '+91 9656950687', label: 'Wellness Clinic', line: '44, Lakeview Street', landmark: 'Opp. Central Park', pincode: '671531', city: 'Kasaragod', state: 'Kerala' },
];

export const ACCOUNT_ADDRESS_COUNT_SEED = ADDRESS_SEED.length;

export function addressCountLabel(count: number): string {
  return count === 1 ? '1 saved address' : `${count} saved addresses`;
}
