import { argon2id } from 'hash-wasm';
import type { KeyBundle } from './types';

const DB_NAME = 'qmail-vault';
const STORE_NAME = 'keys';
const VAULT_KEY = 'primary';
const ARGON2_MEM = 65536;
const ARGON2_ITER = 3;
const ARGON2_PAR = 4;
const SALT_SIZE = 32;
const IV_SIZE = 12;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbGet(db: IDBDatabase, key: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbPut(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function dbDelete(db: IDBDatabase, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deriveVaultKey(passphrase: string, salt: Uint8Array): Promise<Uint8Array> {
  const hash = await argon2id({
    password: passphrase,
    salt,
    parallelism: ARGON2_PAR,
    iterations: ARGON2_ITER,
    memorySize: ARGON2_MEM,
    hashLength: 32,
    outputType: 'binary',
  });
  return new Uint8Array(hash);
}

function serializeBundle(bundle: KeyBundle): Uint8Array {
  const fields = [
    bundle.kemPublicKey, bundle.kemSecretKey,
    bundle.signPublicKey, bundle.signSecretKey,
    bundle.x25519PublicKey, bundle.x25519SecretKey,
  ];
  const lengths = fields.map(f => f.length);
  const header = new Uint8Array(new Uint32Array(lengths).buffer);
  let total = header.length;
  for (const f of fields) total += f.length;
  const out = new Uint8Array(total);
  out.set(header);
  let offset = header.length;
  for (const f of fields) {
    out.set(f, offset);
    offset += f.length;
  }
  return out;
}

function deserializeBundle(data: Uint8Array): KeyBundle {
  const headerLen = 6 * 4;
  const header = new Uint32Array(data.buffer, data.byteOffset, 6);
  let offset = headerLen;
  const fields: Uint8Array[] = [];
  for (let i = 0; i < 6; i++) {
    const len = header[i];
    fields.push(data.slice(offset, offset + len));
    offset += len;
  }
  return {
    kemPublicKey: fields[0],
    kemSecretKey: fields[1],
    signPublicKey: fields[2],
    signSecretKey: fields[3],
    x25519PublicKey: fields[4],
    x25519SecretKey: fields[5],
  };
}

async function encryptBundle(vaultKey: Uint8Array, plaintext: Uint8Array): Promise<{
  iv: Uint8Array;
  ciphertext: Uint8Array;
}> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));
  const key = await crypto.subtle.importKey(
    'raw', vaultKey as BufferSource, 'AES-GCM', false, ['encrypt'],
  );
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as BufferSource }, key, plaintext as BufferSource,
    ),
  );
  return { iv, ciphertext: ct };
}

async function decryptBundle(
  vaultKey: Uint8Array,
  iv: Uint8Array,
  ciphertext: Uint8Array,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw', vaultKey as BufferSource, 'AES-GCM', false, ['decrypt'],
  );
  return new Uint8Array(
    await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource }, key, ciphertext as BufferSource,
    ),
  );
}

interface StoredVault {
  salt: number[];
  iv: number[];
  ciphertext: number[];
}

export async function createVault(passphrase: string, bundle: KeyBundle): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_SIZE));
  const vaultKey = await deriveVaultKey(passphrase, salt);
  const serialized = serializeBundle(bundle);
  const { iv, ciphertext } = await encryptBundle(vaultKey, serialized);

  const db = await openDb();
  const stored: StoredVault = {
    salt: Array.from(salt),
    iv: Array.from(iv),
    ciphertext: Array.from(ciphertext),
  };
  await dbPut(db, VAULT_KEY, stored);
  db.close();
}

export async function unlockVault(passphrase: string): Promise<KeyBundle> {
  const db = await openDb();
  const stored = (await dbGet(db, VAULT_KEY)) as StoredVault | undefined;
  db.close();

  if (!stored) throw new Error('No vault found');

  const salt = new Uint8Array(stored.salt);
  const iv = new Uint8Array(stored.iv);
  const ciphertext = new Uint8Array(stored.ciphertext);

  const vaultKey = await deriveVaultKey(passphrase, salt);
  const serialized = await decryptBundle(vaultKey, iv, ciphertext);
  return deserializeBundle(serialized);
}

export async function changePassphrase(
  oldPassphrase: string,
  newPassphrase: string,
): Promise<void> {
  const bundle = await unlockVault(oldPassphrase);
  await createVault(newPassphrase, bundle);
}

export async function vaultExists(): Promise<boolean> {
  const db = await openDb();
  const stored = await dbGet(db, VAULT_KEY);
  db.close();
  return stored !== undefined;
}

export async function destroyVault(): Promise<void> {
  const db = await openDb();
  await dbDelete(db, VAULT_KEY);
  db.close();
}
