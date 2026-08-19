export type View = 'inbox' | 'compose' | 'keys' | 'qkd' | 'settings' | 'dashboard';

export type AuthState = 'unauthenticated' | 'authenticated';

export type EncryptionStatus = 'quantum-secure' | 'post-quantum' | 'classic' | 'unsigned';

export type KeyAlgorithm = 'ML-KEM-768' | 'ML-DSA-65' | 'AES-256-GCM' | 'Hybrid';

export type KeyStatus = 'active' | 'expiring' | 'revoked' | 'generating';

export type QKDLinkStatus = 'connected' | 'syncing' | 'degraded' | 'disconnected';

export interface User {
  id: string;
  email: string;
  name: string;
  organization: string;
  role: string;
  avatarColor: string;
  keyId: string;
  registeredAt: string;
}

export interface QuantumKey {
  id: string;
  algorithm: KeyAlgorithm;
  status: KeyStatus;
  fingerprint: string;
  createdAt: string;
  expiresAt: string;
  keySize: string;
  purpose: 'encapsulation' | 'signature' | 'symmetric' | 'hybrid';
  rotations: number;
  publicKeyPreview: string;
}

export interface QKDLink {
  id: string;
  peer: string;
  peerNode: string;
  status: QKDLinkStatus;
  keyRate: number;
  qber: number;
  distance: number;
  protocol: string;
  establishedAt: string;
  keysDistributed: number;
}

export interface EmailAttachment {
  id: string;
  name: string;
  size: string;
  encrypted: boolean;
}

export interface Email {
  id: string;
  from: string;
  fromName: string;
  to: string;
  subject: string;
  preview: string;
  body: string;
  date: string;
  read: boolean;
  starred: boolean;
  folder: 'inbox' | 'sent' | 'drafts' | 'archive';
  encryption: EncryptionStatus;
  signed: boolean;
  signatureValid: boolean;
  attachments: EmailAttachment[];
  keyIdUsed: string;
  signatureAlgorithm?: string;
}

export interface ActivityEvent {
  id: string;
  type: 'key-generated' | 'key-rotated' | 'email-sent' | 'email-received' | 'qkd-link' | 'signature' | 'auth';
  message: string;
  timestamp: string;
  severity: 'info' | 'success' | 'warning';
}

export interface SecurityMetric {
  label: string;
  value: string;
  detail: string;
  trend: 'up' | 'down' | 'stable';
  icon: string;
}
