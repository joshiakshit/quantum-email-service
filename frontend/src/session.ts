import {
  createCryptoWorker,
  createVault,
  unlockVault,
  vaultExists,
  exportVaultBlob,
  importVaultBlob,
  type CryptoWorkerAPI,
  type KeyBundle,
} from '@/crypto';

// Secret keys live only here (in memory) and in the Argon2id vault (IndexedDB).
// They are never sent to the server.
let bundle: KeyBundle | null = null;
let worker: CryptoWorkerAPI | null = null;

function getWorker(): CryptoWorkerAPI {
  if (!worker) worker = createCryptoWorker();
  return worker;
}

function b64Encode(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
  return btoa(binary);
}

function b64Decode(s: string): Uint8Array {
  const binary = atob(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export interface PublicKeysB64 {
  kem_pk: string;
  sign_pk: string;
  x25519_pk: string;
}

export interface RecipientKeys {
  client_id: string;
  kem_pk: string;
  sign_pk: string;
  x25519_pk: string;
}

export interface VaultBlobB64 {
  salt: string;
  iv: string;
  ciphertext: string;
}

// The stored vault is already passphrase-encrypted, so this blob is safe to sync
// through the server for multi-device access. The server cannot read it.
export async function getVaultBlob(): Promise<VaultBlobB64 | null> {
  const blob = await exportVaultBlob();
  if (!blob) return null;
  return {
    salt: b64Encode(Uint8Array.from(blob.salt)),
    iv: b64Encode(Uint8Array.from(blob.iv)),
    ciphertext: b64Encode(Uint8Array.from(blob.ciphertext)),
  };
}

export async function installVaultBlob(b: VaultBlobB64): Promise<void> {
  await importVaultBlob({
    salt: Array.from(b64Decode(b.salt)),
    iv: Array.from(b64Decode(b.iv)),
    ciphertext: Array.from(b64Decode(b.ciphertext)),
  });
}

export function hasVault(): Promise<boolean> {
  return vaultExists();
}

export function isUnlocked(): boolean {
  return bundle !== null;
}

export function lock(): void {
  bundle = null;
}

// First device: generate keys, seal them into a fresh vault, return the public
// keys to register with the directory.
export async function provision(passphrase: string): Promise<PublicKeysB64> {
  bundle = await getWorker().generateKeys();
  await createVault(passphrase, bundle);
  return publicKeys();
}

export async function unlock(passphrase: string): Promise<void> {
  bundle = await unlockVault(passphrase);
}

export function publicKeys(): PublicKeysB64 {
  if (!bundle) throw new Error('Vault is locked');
  return {
    kem_pk: b64Encode(bundle.kemPublicKey),
    sign_pk: b64Encode(bundle.signPublicKey),
    x25519_pk: b64Encode(bundle.x25519PublicKey),
  };
}

// Seal one body for a recipient. Used twice per send: once for the recipient,
// once to self so the Sent copy stays readable and server-blind.
export async function seal(
  plaintext: string,
  senderId: string,
  recipient: RecipientKeys,
  subject: string,
): Promise<string> {
  if (!bundle) throw new Error('Vault is locked');
  return getWorker().sealEnvelope(
    new TextEncoder().encode(plaintext),
    b64Decode(recipient.kem_pk),
    bundle.signSecretKey,
    senderId,
    recipient.client_id,
    b64Decode(recipient.x25519_pk),
    subject,
  );
}

export async function open(envelopeJson: string, senderVerifyKeyB64: string): Promise<string> {
  if (!bundle) throw new Error('Vault is locked');
  if (!envelopeJson || !senderVerifyKeyB64) throw new Error('Missing envelope or key');
  const plaintext = await getWorker().openEnvelope(
    envelopeJson,
    bundle.kemSecretKey,
    bundle.x25519SecretKey,
    b64Decode(senderVerifyKeyB64),
  );
  return new TextDecoder().decode(plaintext);
}
