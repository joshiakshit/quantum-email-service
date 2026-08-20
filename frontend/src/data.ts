import type { AvatarStyle } from './types';

export const FOLDER_IDS = ['inbox', 'sent', 'drafts', 'starred', 'archive', 'trash'] as const;

export const FOLDER_LABELS: Record<string, string> = {
  inbox: 'Inbox',
  sent: 'Sent',
  drafts: 'Drafts',
  starred: 'Starred',
  archive: 'Archive',
  trash: 'Trash',
};

export const SETTINGS_TABS = [
  { id: 'security', label: 'Encryption & Security' },
  { id: 'account', label: 'Account' },
  { id: 'privacy', label: 'Privacy & Logs' },
] as const;

export const AVATARS: AvatarStyle[] = [
  { bg: 'var(--accent-bg)', color: 'var(--accent)' },
  { bg: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' },
  { bg: 'rgba(244, 114, 182, 0.1)', color: '#f472b6' },
  { bg: 'rgba(74, 222, 128, 0.1)', color: '#4ade80' },
];

export const LABELS = [
  { name: 'Classified', color: '#ef4444' },
  { name: 'Mission Critical', color: '#3b82f6' },
  { name: 'Cleared', color: '#22c55e' },
];

export function getInitials(name: string): string {
  if (name === 'You') return 'ME';
  const caps = name.split(' ').map(w => w[0]).filter(c => /[A-Z]/.test(c)).slice(0, 2).join('');
  return caps || name.slice(0, 2).toUpperCase();
}
