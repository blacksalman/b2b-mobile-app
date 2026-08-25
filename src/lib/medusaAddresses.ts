import { storeFetch, storeMutate } from './medusaClient';

// Native /store/customers/me/addresses CRUD (docs/STORE_API.md section 8), scoped to whatever
// customer token is currently cached (see authToken.ts). Live-tested by the backend
// implementation pass: list/create/get/update/delete all confirmed working end to end.
export interface MedusaAddress {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  address_1: string;
  address_2: string | null;
  city: string;
  province: string | null;
  postal_code: string;
  country_code: string;
  phone: string | null;
  is_default_shipping: boolean;
  is_default_billing: boolean;
}

export interface AddressInput {
  first_name: string;
  last_name?: string;
  company?: string;
  address_1: string;
  address_2?: string;
  city: string;
  province?: string;
  postal_code: string;
  phone?: string;
  is_default_shipping?: boolean;
  is_default_billing?: boolean;
}

// India-only app (see the delivery-tat/pincode-check feature elsewhere) - every address is
// country_code "in", same as every other India-specific assumption already baked into this app.
const COUNTRY_CODE = 'in';

export async function fetchAddresses(): Promise<MedusaAddress[]> {
  const data = await storeFetch<{ addresses: MedusaAddress[] }>('/store/customers/me/addresses');
  return data.addresses;
}

// Response is the whole customer record (native route re-fetches the customer, not just the new
// address) - callers that need the created address's id call fetchAddresses() again afterward
// rather than guess which entry in that array is the new one.
export async function createAddress(input: AddressInput): Promise<void> {
  await storeMutate('/store/customers/me/addresses', 'POST', {
    ...input,
    country_code: COUNTRY_CODE,
  });
}

export async function updateAddress(addressId: string, input: AddressInput): Promise<void> {
  await storeMutate(`/store/customers/me/addresses/${addressId}`, 'POST', {
    ...input,
    country_code: COUNTRY_CODE,
  });
}

export async function deleteAddress(addressId: string): Promise<void> {
  await storeMutate(`/store/customers/me/addresses/${addressId}`, 'DELETE');
}
