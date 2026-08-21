import { sign, verify } from './pqc';
import { encrypt, decrypt } from './symmetric';
import { hybridKemEncapsulate, hybridKemDecapsulate } from './hybrid';
import type { EnvelopeV2 } from './types';

const ENVELOPE_VERSION = 2;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

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

function lp(data: Uint8Array): Uint8Array {
  const len = new DataView(new ArrayBuffer(4));
  len.setUint32(0, data.length);
  const out = new Uint8Array(4 + data.length);
  out.set(new Uint8Array(len.buffer));
  out.set(data, 4);
  return out;
}

function lpStr(s: string): Uint8Array {
  return lp(encoder.encode(s));
}

function concatAll(...arrays: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const a of arrays) total += a.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

function timestampBytes(ts: number): Uint8Array {
  const buf = new DataView(new ArrayBuffer(8));
  buf.setBigUint64(0, BigInt(ts));
  return new Uint8Array(buf.buffer);
}

function buildContextAad(
  senderId: string,
  recipientId: string,
  subject: string,
  messageId: string,
  timestamp: number,
): Uint8Array {
  return concatAll(
    lpStr(senderId),
    lpStr(recipientId),
    lpStr(subject),
    lpStr(messageId),
    lp(timestampBytes(timestamp)),
  );
}

function buildSignedPayloadV2(
  senderId: string,
  recipientId: string,
  subject: string,
  messageId: string,
  timestamp: number,
  x25519EphemPk: Uint8Array,
  kemCt: Uint8Array,
  nonce: Uint8Array,
  ciphertext: Uint8Array,
  tag: Uint8Array,
): Uint8Array {
  return concatAll(
    lpStr(senderId),
    lpStr(recipientId),
    lpStr(subject),
    lpStr(messageId),
    lp(timestampBytes(timestamp)),
    lp(x25519EphemPk),
    lp(kemCt),
    lp(nonce),
    lp(ciphertext),
    lp(tag),
  );
}

function generateUUID(): string {
  return crypto.randomUUID();
}

export async function sealEnvelope(
  plaintext: Uint8Array,
  recipientKemPk: Uint8Array,
  senderSignSk: Uint8Array,
  senderId: string,
  recipientId: string,
  recipientX25519Pk: Uint8Array,
  subject = '',
  messageId?: string,
): Promise<string> {
  if (!messageId) messageId = generateUUID();
  const timestamp = Math.floor(Date.now() / 1000);

  const { kemCt, ephemeralPk, sessionKey } = await hybridKemEncapsulate(
    recipientKemPk,
    recipientX25519Pk,
  );

  const aad = buildContextAad(senderId, recipientId, subject, messageId, timestamp);
  const { nonce, ciphertext, tag } = await encrypt(sessionKey, plaintext, aad);

  const signedPayload = buildSignedPayloadV2(
    senderId, recipientId, subject, messageId, timestamp,
    ephemeralPk, kemCt, nonce, ciphertext, tag,
  );
  const signature = sign(senderSignSk, signedPayload);

  const envelope: EnvelopeV2 = {
    version: ENVELOPE_VERSION,
    kem: 'X25519+ML-KEM-768',
    sig: 'ML-DSA-65',
    sym: 'AES-256-GCM',
    kdf: 'HKDF-SHA256',
    sender_id: senderId,
    recipient_id: recipientId,
    message_id: messageId,
    timestamp,
    subject,
    x25519_ephemeral_pk: b64Encode(ephemeralPk),
    kem_ciphertext: b64Encode(kemCt),
    nonce: b64Encode(nonce),
    ciphertext: b64Encode(ciphertext),
    tag: b64Encode(tag),
    signature: b64Encode(signature),
  };

  return JSON.stringify(envelope);
}

export async function openEnvelope(
  envelopeJson: string,
  recipientKemSk: Uint8Array,
  recipientX25519Sk: Uint8Array,
  senderVerifyKey: Uint8Array,
): Promise<Uint8Array> {
  const envelope = JSON.parse(envelopeJson) as EnvelopeV2;

  if (envelope.version !== 2) {
    throw new Error(`Unsupported envelope version: ${envelope.version}`);
  }

  const kemCt = b64Decode(envelope.kem_ciphertext);
  const x25519EphemPk = b64Decode(envelope.x25519_ephemeral_pk);
  const nonce = b64Decode(envelope.nonce);
  const ciphertext = b64Decode(envelope.ciphertext);
  const tag = b64Decode(envelope.tag);
  const signature = b64Decode(envelope.signature);

  const { sender_id, recipient_id, message_id, timestamp } = envelope;
  const subject = envelope.subject ?? '';

  const signedPayload = buildSignedPayloadV2(
    sender_id, recipient_id, subject, message_id, timestamp,
    x25519EphemPk, kemCt, nonce, ciphertext, tag,
  );

  if (!verify(senderVerifyKey, signedPayload, signature)) {
    throw new Error('Signature verification failed');
  }

  const sessionKey = await hybridKemDecapsulate(
    recipientKemSk, recipientX25519Sk, kemCt, x25519EphemPk,
  );

  const aad = buildContextAad(sender_id, recipient_id, subject, message_id, timestamp);
  return decrypt(sessionKey, nonce, ciphertext, tag, aad);
}

export function decodeEnvelopeText(plaintext: Uint8Array): string {
  return decoder.decode(plaintext);
}
