const BASE = '/api';
const AUTH_SERVICE = import.meta.env.VITE_AUTH_URL || 'https://auth.joshiakshit.live';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('qumail_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...opts?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export interface AuthResponse {
  token: string;
  client_id: string;
  name: string;
  email: string;
  kem_fingerprint: string;
  signing_fingerprint: string;
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

export function getAuthLoginUrl() {
  const redirectUri = `${window.location.origin}/callback`;
  return `${AUTH_SERVICE}/login?client_id=qmail&redirect_uri=${encodeURIComponent(redirectUri)}`;
}

export function getAuthRegisterUrl() {
  const redirectUri = `${window.location.origin}/callback`;
  return `${AUTH_SERVICE}/register?client_id=qmail&redirect_uri=${encodeURIComponent(redirectUri)}`;
}

export function exchangeToken(authToken: string) {
  return request<AuthResponse>('/auth/exchange', {
    method: 'POST',
    body: JSON.stringify({ auth_token: authToken }),
  });
}

export function getAuthStatus() {
  return request<Omit<AuthResponse, 'token'>>('/auth/status');
}

export function getEmails(folder = 'inbox') {
  return request<{ emails: import('./types').Email[] }>(`/emails?folder=${folder}`);
}

export function sendEmail(toEmail: string, subject: string, body: string) {
  return request<{ status: string; encrypted: boolean; algorithm: string; fingerprint: string }>(
    '/emails/send',
    { method: 'POST', body: JSON.stringify({ to_email: toEmail, subject, body }) },
  );
}

export function getKeysInfo() {
  return request<KeysInfo>('/keys/info');
}

export function logout() {
  return request<{ status: string }>('/auth/logout', { method: 'POST' });
}
