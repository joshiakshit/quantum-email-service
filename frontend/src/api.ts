import { encryptPassword } from '@/crypto/authCrypto';

const BASE = '/api';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('qmail_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...opts?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const message = typeof err.detail === 'string' ? err.detail : 'Request failed';
    throw new Error(message);
  }
  return res.json();
}

export interface AuthResponse {
  token: string;
  client_id: string;
  name: string;
  email: string;
  keys_registered: boolean;
  kem_fingerprint: string;
  signing_fingerprint: string;
}

export interface RegisterKeysResponse {
  client_id: string;
  name: string;
  keys_registered: boolean;
  kem_fingerprint: string;
  signing_fingerprint: string;
  registered_at: string;
}

export interface RecipientKeysResponse {
  client_id: string;
  kem_pk: string;
  sign_pk: string;
  x25519_pk: string;
}

// Server-side view of a message: ciphertext envelope plus the sender's public
// verify key. The body is decrypted client-side; the server never sees it.
export interface RawEmail {
  id: number;
  folder: string;
  sender: string;
  senderEmail: string;
  subject: string;
  envelope: string;
  senderVerifyKey: string;
  time: string;
  fullDate: string;
  unread: boolean;
  avatarIdx: number;
  label: string;
  labelBg: string;
  labelColor: string;
}

export interface KeysInfo {
  client_id: string;
  kem_algorithm: string;
  signing_algorithm: string;
  kem_fingerprint: string;
  signing_fingerprint: string;
  registered_at: string;
  km_url: string;
  km_status: string;
}

export async function login(username: string, password: string) {
  const encrypted_password = await encryptPassword(password);
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, encrypted_password }),
  });
}

export async function register(firstName: string, lastName: string, username: string, password: string) {
  const encrypted_password = await encryptPassword(password);
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ first_name: firstName, last_name: lastName, username, encrypted_password }),
  });
}

export function getAuthStatus() {
  return request<Omit<AuthResponse, 'token'>>('/auth/status');
}

export function registerKeys(publicKeys: { kem_pk: string; sign_pk: string; x25519_pk: string }) {
  return request<RegisterKeysResponse>('/keys/register', {
    method: 'POST',
    body: JSON.stringify(publicKeys),
  });
}

export interface VaultBlobResponse {
  salt: string;
  iv: string;
  ciphertext: string;
}

export function putVault(blob: { salt: string; iv: string; ciphertext: string }) {
  return request<{ status: string }>('/vault', { method: 'PUT', body: JSON.stringify(blob) });
}

export function getVault() {
  return request<VaultBlobResponse>('/vault');
}

export function lookupRecipient(email: string) {
  return request<RecipientKeysResponse>(`/keys/lookup?email=${encodeURIComponent(email)}`);
}

export function getEmails(folder = 'inbox') {
  return request<{ emails: RawEmail[] }>(`/emails?folder=${folder}`);
}

export function sendEmail(
  toEmail: string,
  subject: string,
  recipientEnvelope: string,
  selfEnvelope: string,
) {
  return request<{ status: string; encrypted: boolean; algorithm: string; fingerprint: string }>(
    '/emails/send',
    {
      method: 'POST',
      body: JSON.stringify({
        to_email: toEmail,
        subject,
        recipient_envelope: recipientEnvelope,
        self_envelope: selfEnvelope,
      }),
    },
  );
}

export function getKeysInfo() {
  return request<KeysInfo>('/keys/info');
}

export function logout() {
  return request<{ status: string }>('/auth/logout', { method: 'POST' });
}
