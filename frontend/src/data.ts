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
  { bg: 'var(--color-accent-800)', color: 'var(--color-accent-200)' },
  { bg: '#1a3a4a', color: '#6fa8dc' },
  { bg: '#3a1a2a', color: '#e06666' },
  { bg: '#1a3a2a', color: '#93c47d' },
];

export const LABELS = [
  { name: 'Classified', color: '#e06666' },
  { name: 'Mission Critical', color: '#6fa8dc' },
  { name: 'Cleared', color: '#93c47d' },
];

export function getInitials(name: string): string {
  if (name === 'You') return 'ME';
  const caps = name.split(' ').map(w => w[0]).filter(c => /[A-Z]/.test(c)).slice(0, 2).join('');
  return caps || name.slice(0, 2).toUpperCase();
}
