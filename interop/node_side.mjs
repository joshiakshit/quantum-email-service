import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORK = process.argv[2];
const STAGE = process.argv[3];

const B = await import(pathToFileURL(path.join(HERE, 'dist', 'envelope_bundle.mjs')).href);
const hx = (h) => Uint8Array.from(Buffer.from(h, 'hex'));
const xh = (b) => Buffer.from(b).toString('hex');
const rd = (f) => JSON.parse(fs.readFileSync(path.join(WORK, f), 'utf8'));
const wr = (f, o) => fs.writeFileSync(path.join(WORK, f), JSON.stringify(o));

if (STAGE === 'gen-recipient') {
  // Round A: TS is the recipient. Keypair generated locally; only public keys ship.
  const kem = B.generateKemKeypair();
  const x = await B.generateX25519Keypair();
  wr('ts_recipient_secret.json', { kem_sk: xh(kem.secretKey), x25519_sk: xh(x.secretKey) });
  wr('ts_recipient_public.json', { kem_pk: xh(kem.publicKey), x25519_pk: xh(x.publicKey) });
} else if (STAGE === 'open') {
  // Round A: open the envelope Python sealed to the TS recipient.
  const sec = rd('ts_recipient_secret.json');
  const sealed = rd('py_sealed.json');
  const pt = await B.openEnvelope(
    sealed.envelope, hx(sec.kem_sk), hx(sec.x25519_sk), hx(sealed.sender_verify_key),
  );
  const text = Buffer.from(pt).toString('utf8');
  wr('result_A.json', { ok: text === sealed.expected_plaintext });
} else if (STAGE === 'seal') {
  // Round B: TS is the sender; Python is the recipient (public keys shipped in).
  const rp = rd('py_recipient_public.json');
  const sig = B.generateSigningKeypair();
  const plaintext = 'Round B: TS seals, Python opens.';
  const envelope = await B.sealEnvelope(
    new TextEncoder().encode(plaintext),
    hx(rp.kem_pk), sig.secretKey,
    'ts-sender-01', 'py-recipient-01',
    hx(rp.x25519_pk), 'Interop Subject B',
  );
  wr('ts_sealed.json', { envelope, sender_verify_key: xh(sig.publicKey), expected_plaintext: plaintext });
} else {
  throw new Error(`unknown stage: ${STAGE}`);
}
