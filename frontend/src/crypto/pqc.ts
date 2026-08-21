import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';

export function generateKemKeypair(): { publicKey: Uint8Array; secretKey: Uint8Array } {
  return ml_kem768.keygen();
}

export function kemEncapsulate(publicKey: Uint8Array): {
  ciphertext: Uint8Array;
  sharedSecret: Uint8Array;
} {
  const { cipherText, sharedSecret } = ml_kem768.encapsulate(publicKey);
  return { ciphertext: cipherText, sharedSecret };
}

export function kemDecapsulate(ciphertext: Uint8Array, secretKey: Uint8Array): Uint8Array {
  return ml_kem768.decapsulate(ciphertext, secretKey);
}

export function generateSigningKeypair(): { publicKey: Uint8Array; secretKey: Uint8Array } {
  return ml_dsa65.keygen();
}

export function sign(secretKey: Uint8Array, data: Uint8Array): Uint8Array {
  return ml_dsa65.sign(data, secretKey);
}

export function verify(publicKey: Uint8Array, data: Uint8Array, signature: Uint8Array): boolean {
  try {
    return ml_dsa65.verify(signature, data, publicKey);
  } catch {
    return false;
  }
}
