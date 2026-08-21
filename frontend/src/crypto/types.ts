export interface KeyBundle {
  kemPublicKey: Uint8Array;
  kemSecretKey: Uint8Array;
  signPublicKey: Uint8Array;
  signSecretKey: Uint8Array;
  x25519PublicKey: Uint8Array;
  x25519SecretKey: Uint8Array;
}

export interface EnvelopeV2 {
  version: 2;
  kem: string;
  sig: string;
  sym: string;
  kdf: string;
  sender_id: string;
  recipient_id: string;
  message_id: string;
  timestamp: number;
  subject: string;
  x25519_ephemeral_pk: string;
  kem_ciphertext: string;
  nonce: string;
  ciphertext: string;
  tag: string;
  signature: string;
}

export interface VaultData {
  salt: Uint8Array;
  iv: Uint8Array;
  ciphertext: Uint8Array;
}

export interface WorkerRequest {
  id: number;
  method: string;
  args: unknown[];
}

export interface WorkerResponse {
  id: number;
  result?: unknown;
  error?: string;
}
