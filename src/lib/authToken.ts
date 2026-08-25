import AsyncStorage from '@react-native-async-storage/async-storage';

// Standalone (no medusaClient import) so medusaClient can depend on this for the Authorization
// header without a circular import - medusaAuth.ts (which owns the actual login/register/logout
// flows) depends on both this and medusaClient.
const TOKEN_STORAGE_KEY = 'medusa_customer_token';

let cachedToken: string | null = null;
let hydratePromise: Promise<string | null> | null = null;

// Called once on app start (AppStateProvider, alongside cartSync's hydrateCartState) so every
// request made during the rest of this boot already carries the right Authorization header,
// instead of racing the first screen's own fetches.
export function hydrateToken(): Promise<string | null> {
  if (!hydratePromise) {
    hydratePromise = AsyncStorage.getItem(TOKEN_STORAGE_KEY).then((t) => {
      cachedToken = t;
      return cachedToken;
    });
  }
  return hydratePromise;
}

export function getCachedToken(): string | null {
  return cachedToken;
}

export async function setToken(token: string): Promise<void> {
  cachedToken = token;
  await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export async function clearToken(): Promise<void> {
  cachedToken = null;
  await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
}

// Spread into every store/auth request's headers (see medusaClient.ts) - empty object when
// logged out, so this is safe to always include rather than only when a token exists.
export function getAuthHeader(): Record<string, string> {
  return cachedToken ? { Authorization: `Bearer ${cachedToken}` } : {};
}
