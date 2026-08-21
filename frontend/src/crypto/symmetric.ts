const NONCE_SIZE = 12;
const TAG_SIZE = 16;

export async function encrypt(
  key: Uint8Array,
  plaintext: Uint8Array,
  aad?: Uint8Array,
): Promise<{ nonce: Uint8Array; ciphertext: Uint8Array; tag: Uint8Array }> {
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_SIZE));
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key as BufferSource, 'AES-GCM', false, ['encrypt'],
  );

  const params: AesGcmParams = { name: 'AES-GCM', iv: nonce, tagLength: TAG_SIZE * 8 };
  if (aad) params.additionalData = aad as BufferSource;

  const combined = new Uint8Array(
    await crypto.subtle.encrypt(params, cryptoKey, plaintext as BufferSource),
  );
  const ciphertext = combined.slice(0, combined.length - TAG_SIZE);
  const tag = combined.slice(combined.length - TAG_SIZE);

  return { nonce, ciphertext, tag };
}

export async function decrypt(
  key: Uint8Array,
  nonce: Uint8Array,
  ciphertext: Uint8Array,
  tag: Uint8Array,
  aad?: Uint8Array,
): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key as BufferSource, 'AES-GCM', false, ['decrypt'],
  );

  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext);
  combined.set(tag, ciphertext.length);

  const params: AesGcmParams = { name: 'AES-GCM', iv: nonce as BufferSource, tagLength: TAG_SIZE * 8 };
  if (aad) params.additionalData = aad as BufferSource;

  return new Uint8Array(await crypto.subtle.decrypt(params, cryptoKey, combined as BufferSource));
}
