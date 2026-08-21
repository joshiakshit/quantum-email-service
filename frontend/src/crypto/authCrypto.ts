/**
 * authCrypto.ts
 *
 * Fetches the gateway's ephemeral RSA-OAEP public key (once per page load)
 * and uses it to encrypt passwords before they leave the browser.
 * This prevents plaintext credentials from appearing in network payloads
 * (DevTools, proxy logs, etc.).
 *
 * The gateway decrypts with its private key (held only in memory, never
 * persisted) before forwarding to the auth service.
 */

let cachedKey: CryptoKey | null = null;

async function fetchServerPublicKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const res = await fetch('/api/auth/public-key');
  if (!res.ok) throw new Error('Failed to fetch server public key');

  const { public_key } = await res.json() as { public_key: string };

  // public_key is Base64-encoded SPKI DER
  const der = Uint8Array.from(atob(public_key), c => c.charCodeAt(0));

  cachedKey = await crypto.subtle.importKey(
    'spki',
    der,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  );

  return cachedKey;
}

/**
 * Encrypts a password string with the server's RSA-OAEP public key.
 * Returns a Base64-encoded ciphertext string safe to send in JSON.
 */
export async function encryptPassword(password: string): Promise<string> {
  const key = await fetchServerPublicKey();
  const encoded = new TextEncoder().encode(password);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    key,
    encoded,
  );
  // Convert to Base64 for JSON transport
  return btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
}

/** Call on logout / page unload to clear the cached key. */
export function clearKeyCache(): void {
  cachedKey = null;
}
