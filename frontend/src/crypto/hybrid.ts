import { kemEncapsulate, kemDecapsulate } from './pqc';

const HKDF_INFO = new TextEncoder().encode('qmail-hybrid-kem-v2');

export async function generateX25519Keypair(): Promise<{
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'X25519' }, true, ['deriveBits'],
  ) as CryptoKeyPair;
  const publicKey = new Uint8Array(
    await crypto.subtle.exportKey('raw', keyPair.publicKey),
  );
  const secretKey = new Uint8Array(
    await crypto.subtle.exportKey('pkcs8', keyPair.privateKey),
  );
  return { publicKey, secretKey };
}

async function x25519Exchange(
  secretKeyPkcs8: Uint8Array,
  peerPublicKeyRaw: Uint8Array,
): Promise<Uint8Array> {
  const privateKey = await crypto.subtle.importKey(
    'pkcs8', secretKeyPkcs8 as BufferSource,
    { name: 'X25519' }, false, ['deriveBits'],
  );
  const publicKey = await crypto.subtle.importKey(
    'raw', peerPublicKeyRaw as BufferSource,
    { name: 'X25519' }, false, [],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'X25519', public: publicKey },
    privateKey, 256,
  );
  return new Uint8Array(bits);
}

async function hkdfDerive(ikm: Uint8Array): Promise<Uint8Array> {
  const baseKey = await crypto.subtle.importKey(
    'raw', ikm as BufferSource, 'HKDF', false, ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0) as BufferSource,
      info: HKDF_INFO as BufferSource,
    },
    baseKey, 256,
  );
  return new Uint8Array(bits);
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

export async function hybridKemEncapsulate(
  recipientKemPk: Uint8Array,
  recipientX25519Pk: Uint8Array,
): Promise<{
  kemCt: Uint8Array;
  ephemeralPk: Uint8Array;
  sessionKey: Uint8Array;
}> {
  const { ciphertext: kemCt, sharedSecret: kemSs } = kemEncapsulate(recipientKemPk);

  const ephemeral = await generateX25519Keypair();
  const x25519Ss = await x25519Exchange(ephemeral.secretKey, recipientX25519Pk);

  const sessionKey = await hkdfDerive(concat(x25519Ss, kemSs));
  return { kemCt, ephemeralPk: ephemeral.publicKey, sessionKey };
}

export async function hybridKemDecapsulate(
  recipientKemSk: Uint8Array,
  recipientX25519Sk: Uint8Array,
  kemCt: Uint8Array,
  x25519EphemeralPk: Uint8Array,
): Promise<Uint8Array> {
  const kemSs = kemDecapsulate(kemCt, recipientKemSk);
  const x25519Ss = await x25519Exchange(recipientX25519Sk, x25519EphemeralPk);
  return hkdfDerive(concat(x25519Ss, kemSs));
}
