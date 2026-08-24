// Ported from `Various Mobile App - Phone.dc.html`'s `POLICIES` const (source lines 2478-2485) — read
// directly, in range. The DCLogic object that builds `profile`/`policyRows`/`addressCountLabel`/
// `logout`/`goEditProfile` itself sits past this project's 256KB `get_file` cap (confirmed truncated
// mid-object at source line 3143, right after `otpDigits`), so those five are inferred from adjacent,
// in-range evidence rather than invented outright — see the call site (`account.tsx`) for exactly
// which value is grounded vs. inferred.
export interface PolicyEntry {
  key: string;
  title: string;
  body: string;
}

export const POLICIES: Record<string, PolicyEntry> = {
  'Terms & Conditions': {
    key: 'Terms & Conditions',
    title: 'Terms and Conditions',
    body: 'Terms and Conditions for AyurvedaOne App\nLast Updated: 19/08/2026\n\nWelcome to the AyurvedaOne App, operated by Ayurveda One Private Limited ("AyurvedaOne", "we", "us", or "our").\n\nBy downloading, installing, accessing or using the App, you agree to these Terms and Conditions. If you do not agree with these Terms, please do not use the App.\n\nUse of the App\nYou agree to use the AyurvedaOne App only for lawful purposes and in accordance with your trade account agreement, including accurate order information and timely payment as per agreed terms.',
  },
  'Privacy Policy': {
    key: 'Privacy Policy',
    title: 'Privacy Policy',
    body: 'Privacy Policy for AyurvedaOne App\nLast Updated: 19/08/2026\n\nWe collect account, order and delivery information to process your wholesale orders and maintain your trade account.\n\nYour data is never sold to third parties. It is used only to fulfil orders, manage invoicing, and improve our catalogue and service for your business.',
  },
  'Return, Refund and Cancellation Policy': {
    key: 'Return, Refund and Cancellation Policy',
    title: 'Return, Refund & Cancellation',
    body: 'Eligible returns are accepted within 10 days of delivery for unused, unopened products in original packaging.\n\nOrders may be cancelled before dispatch from the Orders section. Approved refunds or replacements are processed within 5–7 business days after inspection of the returned carton.',
  },
  'Shipping and Delivery Policy': {
    key: 'Shipping and Delivery Policy',
    title: 'Shipping & Delivery',
    body: 'Orders are generally delivered within 2–3 business days, with shipping charges shown at checkout.\n\nFree delivery applies on eligible orders above ₹5,000. Liquid products or remote locations may take slightly longer to dispatch.',
  },
  Disclaimer: {
    key: 'Disclaimer',
    title: 'Disclaimer',
    body: 'Product information on this app is provided for trade reference only and does not replace professional medical advice.\n\nAyurvedaOne is not liable for misuse of products outside their intended classical indications. Always verify batch and licensing details before resale.',
  },
  'About Us': {
    key: 'About Us',
    title: 'About Us',
    body: 'AyurvedaOne is a B2B wholesale platform connecting pharmacies, clinics and wellness retailers with GMP-certified Ayurvedic manufacturers.\n\nWe work with verified brands to bring classical formulations, tailas, churna and rasayana products to your business with transparent trade pricing.',
  },
  'Contact Us': {
    key: 'Contact Us',
    title: 'Contact Us',
    body: 'Need help with an order or your account?\n\nEmail: support@ayurvedaone.in\nPhone: +91 80 4712 5566\nHours: Mon–Sat, 9am – 7pm IST',
  },
};

// The 5 rows the Account screen's `policyRows` list renders (hint-placeholder-count="5" in the
// source markup) — every POLICIES key except 'About Us'/'Contact Us', which the screen renders as its
// own separate "About" section with dedicated openAbout/openContact handlers instead.
export const POLICY_ROW_KEYS = [
  'Terms & Conditions',
  'Privacy Policy',
  'Return, Refund and Cancellation Policy',
  'Shipping and Delivery Policy',
  'Disclaimer',
] as const;

// Inferred: the DCLogic defining `profile` itself is past the 256KB truncation point, but the source's
// ORDERS mock data (in range, source line 2488-2499) repeats the same delivery contact on every order —
// name 'Tom Sharma', phone '+91 96569 50687' — and `saveAddress`'s default add-address form (in range,
// source line 2717-2718) seeds `addrName:'Tom'`, `addrPhone:'+91 9656950687'` (same person, formatting
// difference only). Reused here rather than invented; initials computed from the name.
export const accountProfile = {
  name: 'Tom Sharma',
  phone: '+91 96569 50687',
  initials: 'TS',
};

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
