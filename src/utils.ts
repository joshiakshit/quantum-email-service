import type { EncryptionStatus, KeyStatus, QKDLinkStatus } from './types';

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function generateFingerprint(): string {
  const hex = '0123456789ABCDEF';
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    if (i > 0 && i % 2 === 0) result += ' ';
    result += hex[bytes[i] >> 4] + hex[bytes[i] & 0x0f];
  }
  return result;
}

export function generateHexPreview(length = 64): string {
  const hex = '0123456789abcdef';
  const bytes = new Uint8Array(Math.ceil(length / 2));
  crypto.getRandomValues(bytes);
  let result = '';
  for (const byte of bytes) {
    result += hex[byte >> 4] + hex[byte & 0x0f];
  }
  return result.slice(0, length);
}

export const encryptionStatusConfig: Record<
  EncryptionStatus,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  'quantum-secure': {
    label: 'Quantum-Secure',
    color: 'text-success-300',
    bg: 'bg-success-500/10',
    border: 'border-success-500/30',
    dot: 'bg-success-400',
  },
  'post-quantum': {
    label: 'Post-Quantum',
    color: 'text-quantum-300',
    bg: 'bg-quantum-500/10',
    border: 'border-quantum-500/30',
    dot: 'bg-quantum-400',
  },
  classic: {
    label: 'Classic (Insecure)',
    color: 'text-error-300',
    bg: 'bg-error-500/10',
    border: 'border-error-500/30',
    dot: 'bg-error-400',
  },
  unsigned: {
    label: 'Unsigned',
    color: 'text-warning-300',
    bg: 'bg-warning-500/10',
    border: 'border-warning-500/30',
    dot: 'bg-warning-400',
  },
};

export const keyStatusConfig: Record<KeyStatus, { label: string; color: string; bg: string; dot: string }> = {
  active: { label: 'Active', color: 'text-success-300', bg: 'bg-success-500/10', dot: 'bg-success-400' },
  expiring: { label: 'Expiring Soon', color: 'text-warning-300', bg: 'bg-warning-500/10', dot: 'bg-warning-400' },
  revoked: { label: 'Revoked', color: 'text-error-300', bg: 'bg-error-500/10', dot: 'bg-error-400' },
  generating: { label: 'Generating', color: 'text-quantum-300', bg: 'bg-quantum-500/10', dot: 'bg-quantum-400' },
};

export const qkdStatusConfig: Record<QKDLinkStatus, { label: string; color: string; bg: string; dot: string }> = {
  connected: { label: 'Connected', color: 'text-success-300', bg: 'bg-success-500/10', dot: 'bg-success-400' },
  syncing: { label: 'Syncing', color: 'text-quantum-300', bg: 'bg-quantum-500/10', dot: 'bg-quantum-400' },
  degraded: { label: 'Degraded', color: 'text-warning-300', bg: 'bg-warning-500/10', dot: 'bg-warning-400' },
  disconnected: { label: 'Disconnected', color: 'text-error-300', bg: 'bg-error-500/10', dot: 'bg-error-400' },
};
